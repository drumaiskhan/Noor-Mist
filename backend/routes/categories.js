const express = require('express');
const slugify = require('slugify');
const { query } = require('../config/database');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

// GET /api/categories
router.get('/', async (req, res) => {
  try {
    const result = await query(
      'SELECT * FROM categories WHERE is_active=true ORDER BY position ASC, name ASC'
    );
    res.json({ categories: result.rows });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// GET /api/categories/:slug
router.get('/:slug', async (req, res) => {
  try {
    const result = await query('SELECT * FROM categories WHERE slug=$1', [req.params.slug]);
    if (!result.rows.length) return res.status(404).json({ error: 'Category not found' });
    res.json({ category: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch category' });
  }
});

// POST /api/categories (admin)
router.post('/', requireAdmin, async (req, res) => {
  try {
    const { name, description, image_url, parent_id, show_on_homepage, position, meta_title, meta_description } = req.body;
    let slug = slugify(name, { lower: true, strict: true });
    const existing = await query('SELECT id FROM categories WHERE slug=$1', [slug]);
    if (existing.rows.length) slug = `${slug}-${Date.now()}`;

    const result = await query(
      `INSERT INTO categories (name, slug, description, image_url, parent_id, show_on_homepage, position, meta_title, meta_description)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [name, slug, description, image_url, parent_id || null, show_on_homepage || false, position || 0, meta_title, meta_description]
    );
    res.status(201).json({ category: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create category' });
  }
});

// PUT /api/categories/:id (admin)
router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const { name, description, image_url, parent_id, show_on_homepage, position, is_active, meta_title, meta_description } = req.body;
    const result = await query(
      `UPDATE categories SET name=$1, description=$2, image_url=$3, parent_id=$4, show_on_homepage=$5, position=$6, is_active=$7, meta_title=$8, meta_description=$9
       WHERE id=$10 RETURNING *`,
      [name, description, image_url, parent_id || null, show_on_homepage || false, position || 0, is_active !== false, meta_title, meta_description, req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Category not found' });
    res.json({ category: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update category' });
  }
});

// DELETE /api/categories/:id (admin)
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    await query('DELETE FROM categories WHERE id=$1', [req.params.id]);
    res.json({ message: 'Category deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete category' });
  }
});

module.exports = router;
