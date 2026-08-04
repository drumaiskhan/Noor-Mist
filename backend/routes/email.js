const express = require('express');
const { query } = require('../config/database');
const { requireAdmin } = require('../middleware/auth');
const nodemailer = require('nodemailer');

const router = express.Router();

// GET /api/email/settings
router.get('/settings', requireAdmin, async (req, res) => {
  try {
    const result = await query("SELECT key, value FROM settings WHERE key LIKE 'smtp_%' OR key LIKE 'email_%'");
    const settings = {};
    result.rows.forEach((row) => { settings[row.key] = row.value; });
    // Never return password in plaintext — mask it
    if (settings.smtp_password) settings.smtp_password = '••••••••';
    res.json({ settings });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch email settings' });
  }
});

// PUT /api/email/settings
router.put('/settings', requireAdmin, async (req, res) => {
  try {
    const allowed = [
      'smtp_host', 'smtp_port', 'smtp_user', 'smtp_password',
      'smtp_secure', 'email_from_name', 'email_from_address',
      'email_order_confirmation', 'email_shipping_notification',
      'email_welcome', 'email_password_reset', 'email_newsletter',
    ];
    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        // Don't overwrite password if masked value was sent back
        if (key === 'smtp_password' && req.body[key] === '••••••••') continue;
        await query(
          'INSERT INTO settings (key, value) VALUES ($1,$2) ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value, updated_at=NOW()',
          [key, String(req.body[key])]
        );
      }
    }
    res.json({ message: 'Email settings updated' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update email settings' });
  }
});

// POST /api/email/test
router.post('/test', requireAdmin, async (req, res) => {
  try {
    const result = await query("SELECT key, value FROM settings WHERE key LIKE 'smtp_%' OR key LIKE 'email_from_%'");
    const s = {};
    result.rows.forEach((r) => { s[r.key] = r.value; });

    if (!s.smtp_host) return res.status(400).json({ error: 'SMTP not configured' });

    const transporter = nodemailer.createTransport({
      host: s.smtp_host,
      port: parseInt(s.smtp_port) || 587,
      secure: s.smtp_secure === 'true',
      auth: { user: s.smtp_user, pass: s.smtp_password },
    });

    const { to } = req.body;
    if (!to) return res.status(400).json({ error: 'Recipient email required' });

    await transporter.sendMail({
      from: `"${s.email_from_name || 'Noor Mist'}" <${s.email_from_address || s.smtp_user}>`,
      to,
      subject: 'Noor Mist — Email Test',
      html: '<h2>✅ SMTP is working</h2><p>Your email settings are configured correctly.</p>',
    });

    res.json({ message: 'Test email sent successfully' });
  } catch (error) {
    res.status(500).json({ error: `Failed to send test email: ${error.message}` });
  }
});

module.exports = router;
