const express = require('express');
const { query } = require('../config/database');
const { requireAdmin } = require('../middleware/auth');
const { sendEmail } = require('../services/email');

const router = express.Router();

// Ensure table exists (run once on startup, matches pattern used by reviews.js)
async function ensureContactMessagesTable() {
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS contact_messages (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        subject VARCHAR(255),
        message TEXT NOT NULL,
        is_read BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
  } catch (e) {
    console.error('contact_messages migration:', e.message);
  }
}
ensureContactMessagesTable();

// POST /api/contact  (public — customer submits the contact form)
router.post('/', async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;
    if (!name || !email || !message) {
      return res.status(400).json({ error: 'Name, email and message are required' });
    }

    const result = await query(
      `INSERT INTO contact_messages (name, email, subject, message)
       VALUES ($1,$2,$3,$4) RETURNING *`,
      [name, email, subject || null, message]
    );

    // Notify admin in-app, same pattern as new_review notifications
    await query(
      `INSERT INTO notifications (type, title, message, metadata)
       VALUES ('contact_message','New Contact Message',$1,$2)`,
      [
        `${name} sent a message${subject ? `: ${subject}` : ''}`,
        JSON.stringify({ contact_message_id: result.rows[0].id }),
      ]
    );

    // Best-effort email to the store's configured contact address; never blocks the response
    (async () => {
      try {
        const settingsResult = await query('SELECT value FROM settings WHERE key=$1', ['page_contact']);
        let contactPage = {};
        try { contactPage = settingsResult.rows[0]?.value ? JSON.parse(settingsResult.rows[0].value) : {}; } catch {}
        const to = contactPage.email || process.env.EMAIL_FROM || process.env.EMAIL_USER;
        if (to) {
          await sendEmail({
            to,
            subject: `New Contact Form Message${subject ? `: ${subject}` : ''}`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h1 style="color: #D4AF37;">New Contact Message</h1>
                <p><strong>From:</strong> ${name} (${email})</p>
                ${subject ? `<p><strong>Subject:</strong> ${subject}</p>` : ''}
                <p><strong>Message:</strong></p>
                <p>${String(message).replace(/\n/g, '<br>')}</p>
              </div>
            `,
          });
        }
      } catch (e) {
        console.error('contact notification email failed:', e.message);
      }
    })();

    res.status(201).json({ message: 'Message sent successfully', contact: result.rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// GET /api/contact  (admin — list submissions)
router.get('/', requireAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const countResult = await query('SELECT COUNT(*) FROM contact_messages');
    const result = await query(
      'SELECT * FROM contact_messages ORDER BY created_at DESC LIMIT $1 OFFSET $2',
      [limit, offset]
    );

    res.json({
      messages: result.rows,
      total: parseInt(countResult.rows[0].count),
      page,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// PUT /api/contact/:id/read  (admin — mark as read)
router.put('/:id/read', requireAdmin, async (req, res) => {
  try {
    const result = await query(
      'UPDATE contact_messages SET is_read=true WHERE id=$1 RETURNING *',
      [req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Message not found' });
    res.json({ message: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update message' });
  }
});

// DELETE /api/contact/:id  (admin)
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    await query('DELETE FROM contact_messages WHERE id=$1', [req.params.id]);
    res.json({ message: 'Message deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete message' });
  }
});

module.exports = router;
