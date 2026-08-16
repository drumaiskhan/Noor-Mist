const express = require('express');
const { query } = require('../config/database');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

// GET /api/media
router.get('/', requireAdmin, async (req, res) => {
  try {
    const { search, limit = 60, offset = 0 } = req.query;
    let sql = 'SELECT * FROM media_library';
    const params = [];
    if (search) {
      params.push(`%${search}%`);
      sql += ` WHERE filename ILIKE $1 OR tags ILIKE $1`;
    }
    sql += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(parseInt(limit), parseInt(offset));
    const result = await query(sql, params);
    const countResult = await query('SELECT COUNT(*) FROM media_library');
    res.json({ media: result.rows, total: parseInt(countResult.rows[0].count) });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch media' });
  }
});

// PATCH /api/media/:id — update tags/alt
router.patch('/:id', requireAdmin, async (req, res) => {
  try {
    const { tags, alt_text } = req.body;
    const result = await query(
      'UPDATE media_library SET tags=COALESCE($1,tags), alt_text=COALESCE($2,alt_text) WHERE id=$3 RETURNING *',
      [tags, alt_text, req.params.id]
    );
    res.json({ media: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update media' });
  }
});

// DELETE /api/media/:id
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    await query('DELETE FROM media_library WHERE id=$1', [req.params.id]);
    res.json({ message: 'Deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete media' });
  }
});

// DELETE /api/media/bulk — bulk delete
router.post('/bulk-delete', requireAdmin, async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !ids.length) return res.status(400).json({ error: 'No IDs provided' });
    await query('DELETE FROM media_library WHERE id = ANY($1)', [ids]);
    res.json({ message: `Deleted ${ids.length} items` });
  } catch (error) {
    res.status(500).json({ error: 'Failed to bulk delete' });
  }
});

module.exports = router;
