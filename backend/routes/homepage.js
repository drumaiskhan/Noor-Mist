const express = require('express');
const { query } = require('../config/database');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

// GET /api/homepage
router.get('/', async (req, res) => {
  try {
    const result = await query(
      'SELECT * FROM homepage_sections ORDER BY position ASC'
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch homepage sections' });
  }
});

// PUT /api/homepage/reorder
router.put('/reorder', requireAdmin, async (req, res) => {
  try {
    const { sections } = req.body; // [{id, position}]
    for (const s of sections) {
      await query('UPDATE homepage_sections SET position=$1 WHERE id=$2', [s.position, s.id]);
    }
    res.json({ message: 'Sections reordered' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to reorder sections' });
  }
});

// PUT /api/homepage/:id
router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const { title, content_data, is_enabled, position } = req.body;
    const result = await query(
      `UPDATE homepage_sections SET title=COALESCE($1,title), content_data=COALESCE($2,content_data),
        is_enabled=COALESCE($3,is_enabled), position=COALESCE($4,position), updated_at=NOW()
       WHERE id=$5 RETURNING *`,
      [title, content_data ? JSON.stringify(content_data) : null, is_enabled, position, req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Section not found' });
    res.json({ section: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update section' });
  }
});

module.exports = router;
