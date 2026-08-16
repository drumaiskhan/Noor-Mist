const express = require('express');
const { query } = require('../config/database');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Sections that are structural (gallery, info/buy box) can be reordered but
// should never be fully removable from the page, only re-positioned —
// everything else (tabs, related products, trust badges) can be toggled off.
const LOCKED_KEYS = new Set(['gallery', 'info']);

// GET /api/product-page-sections
router.get('/', async (req, res) => {
  try {
    const result = await query(
      'SELECT * FROM product_page_sections ORDER BY position ASC'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Get product page sections error:', error);
    res.status(500).json({ error: 'Failed to fetch product page sections' });
  }
});

// PUT /api/product-page-sections/reorder
router.put('/reorder', requireAdmin, async (req, res) => {
  try {
    const { sections } = req.body; // [{id, position}]
    if (!Array.isArray(sections)) {
      return res.status(400).json({ error: 'sections array required' });
    }
    for (const s of sections) {
      await query('UPDATE product_page_sections SET position=$1 WHERE id=$2', [s.position, s.id]);
    }
    res.json({ message: 'Sections reordered' });
  } catch (error) {
    console.error('Reorder product page sections error:', error);
    res.status(500).json({ error: 'Failed to reorder sections' });
  }
});

// PUT /api/product-page-sections/:id
router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const { label, is_enabled, position, config } = req.body;

    const current = await query('SELECT section_key FROM product_page_sections WHERE id=$1', [req.params.id]);
    if (!current.rows.length) return res.status(404).json({ error: 'Section not found' });

    const safeEnabled = LOCKED_KEYS.has(current.rows[0].section_key) ? true : is_enabled;

    const result = await query(
      `UPDATE product_page_sections SET label=COALESCE($1,label), is_enabled=COALESCE($2,is_enabled),
        position=COALESCE($3,position), config=COALESCE($4,config), updated_at=NOW()
       WHERE id=$5 RETURNING *`,
      [label, safeEnabled, position, config ? JSON.stringify(config) : null, req.params.id]
    );
    res.json({ section: result.rows[0] });
  } catch (error) {
    console.error('Update product page section error:', error);
    res.status(500).json({ error: 'Failed to update section' });
  }
});

module.exports = router;
