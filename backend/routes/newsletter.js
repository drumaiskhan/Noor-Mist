const express = require('express');
const { query } = require('../config/database');
const { requireAdmin } = require('../middleware/auth');
const { sendNewsletterConfirmation } = require('../services/email');

const router = express.Router();

// POST /api/newsletter/subscribe  (public)
router.post('/subscribe', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'A valid email is required' });
    }

    const existing = await query('SELECT id, is_active FROM newsletter_subscribers WHERE email = $1', [email]);
    if (existing.rows.length) {
      if (existing.rows[0].is_active) {
        return res.status(200).json({ message: "You're already subscribed!" });
      }
      // Re-subscribe someone who had previously unsubscribed
      await query('UPDATE newsletter_subscribers SET is_active = true, subscribed_at = NOW() WHERE email = $1', [email]);
    } else {
      await query(
        'INSERT INTO newsletter_subscribers (email) VALUES ($1)',
        [email]
      );
    }

    // Best-effort confirmation email; never blocks the response
    sendNewsletterConfirmation(email).catch((e) => console.error('newsletter confirmation email failed:', e.message));

    res.status(201).json({ message: 'Thank you for subscribing!' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to subscribe' });
  }
});

// POST /api/newsletter/unsubscribe  (public)
router.post('/unsubscribe', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });

    await query('UPDATE newsletter_subscribers SET is_active = false WHERE email = $1', [email]);
    res.json({ message: 'You have been unsubscribed.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to unsubscribe' });
  }
});

// GET /api/newsletter  (admin — list subscribers)
router.get('/', requireAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const countResult = await query('SELECT COUNT(*) FROM newsletter_subscribers WHERE is_active = true');
    const result = await query(
      'SELECT * FROM newsletter_subscribers WHERE is_active = true ORDER BY subscribed_at DESC LIMIT $1 OFFSET $2',
      [limit, offset]
    );

    res.json({
      subscribers: result.rows,
      total: parseInt(countResult.rows[0].count),
      page,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch subscribers' });
  }
});

// DELETE /api/newsletter/:id  (admin)
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    await query('DELETE FROM newsletter_subscribers WHERE id = $1', [req.params.id]);
    res.json({ message: 'Subscriber removed' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to remove subscriber' });
  }
});

module.exports = router;
