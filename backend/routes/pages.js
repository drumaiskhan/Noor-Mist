const express = require('express');
const { query } = require('../config/database');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

const PAGE_KEYS = ['about', 'contact', 'faq', 'privacy', 'refund', 'shipping_policy', 'terms'];

// GET /api/pages/:page
router.get('/:page', async (req, res) => {
  try {
    const key = `page_${req.params.page}`;
    if (!PAGE_KEYS.includes(req.params.page)) return res.status(404).json({ error: 'Unknown page' });
    const result = await query('SELECT value FROM settings WHERE key=$1', [key]);
    const raw = result.rows[0]?.value;
    let content = null;
    try { content = raw ? JSON.parse(raw) : null; } catch { content = raw; }
    res.json({ content });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch page content' });
  }
});

// PUT /api/pages/:page (admin only)
router.put('/:page', requireAdmin, async (req, res) => {
  try {
    const key = `page_${req.params.page}`;
    if (!PAGE_KEYS.includes(req.params.page)) return res.status(404).json({ error: 'Unknown page' });
    const value = JSON.stringify(req.body);
    await query(
      'INSERT INTO settings (key, value) VALUES ($1,$2) ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value, updated_at=NOW()',
      [key, value]
    );
    res.json({ message: 'Page updated' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update page' });
  }
});

module.exports = router;
