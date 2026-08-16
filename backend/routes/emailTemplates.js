const express = require('express');
const { query } = require('../config/database');
const { requireAdmin } = require('../middleware/auth');
const { TEMPLATE_DEFAULTS } = require('../services/email');

const router = express.Router();

const PLACEHOLDERS = {
  order_received: ['customer_name', 'order_number', 'items_html', 'total_amount', 'payment_method', 'shipping_address', 'confirm_link', 'store_name'],
  order_confirmation: ['customer_name', 'order_number', 'total_amount', 'store_name'],
  order_shipped: ['customer_name', 'order_number', 'store_name', 'tracking_line'],
  welcome: ['customer_name', 'store_name'],
  login_link: ['customer_name', 'store_name', 'login_link'],
  password_reset: ['customer_name', 'store_name', 'reset_link', 'otp_code', 'expiry_hours'],
  newsletter: ['store_name'],
};

// GET /api/email-templates  (admin — list all, seeded defaults included)
router.get('/', requireAdmin, async (req, res) => {
  try {
    const result = await query('SELECT key, subject, body, updated_at FROM email_templates ORDER BY key ASC');
    const templates = result.rows.map((row) => ({ ...row, placeholders: PLACEHOLDERS[row.key] || [] }));
    res.json({ templates });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch email templates' });
  }
});

// PUT /api/email-templates/:key  (admin)
router.put('/:key', requireAdmin, async (req, res) => {
  try {
    const { subject, body } = req.body;
    if (!subject || !body) return res.status(400).json({ error: 'Subject and body are required' });
    if (!TEMPLATE_DEFAULTS[req.params.key]) return res.status(404).json({ error: 'Unknown template' });

    const result = await query(
      `INSERT INTO email_templates (key, subject, body) VALUES ($1,$2,$3)
       ON CONFLICT (key) DO UPDATE SET subject=EXCLUDED.subject, body=EXCLUDED.body, updated_at=NOW()
       RETURNING key, subject, body, updated_at`,
      [req.params.key, subject, body]
    );
    res.json({ template: result.rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update email template' });
  }
});

// POST /api/email-templates/:key/reset  (admin — restore built-in default)
router.post('/:key/reset', requireAdmin, async (req, res) => {
  try {
    const def = TEMPLATE_DEFAULTS[req.params.key];
    if (!def) return res.status(404).json({ error: 'Unknown template' });
    const result = await query(
      `INSERT INTO email_templates (key, subject, body) VALUES ($1,$2,$3)
       ON CONFLICT (key) DO UPDATE SET subject=EXCLUDED.subject, body=EXCLUDED.body, updated_at=NOW()
       RETURNING key, subject, body, updated_at`,
      [req.params.key, def.subject, def.body]
    );
    res.json({ template: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: 'Failed to reset email template' });
  }
});

module.exports = router;
