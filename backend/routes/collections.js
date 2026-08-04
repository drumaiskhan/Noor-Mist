const express = require('express');
const slugify = require('slugify');
const { query } = require('../config/database');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const result = await query('SELECT * FROM collections WHERE is_active=true ORDER BY name ASC');
    res.json({ collections: result.rows });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch collections' });
  }
});

router.get('/:slug', async (req, res) => {
  try {
    const result = await query('SELECT * FROM collections WHERE slug=$1', [req.params.slug]);
    if (!result.rows.length) return res.status(404).json({ error: 'Collection not found' });
    res.json({ collection: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch collection' });
  }
});

router.post('/', requireAdmin, async (req, res) => {
  try {
    const { name, description, image_url, banner_url, show_on_homepage, meta_title, meta_description } = req.body;
    let slug = slugify(name, { lower: true, strict: true });
    const existing = await query('SELECT id FROM collections WHERE slug=$1', [slug]);
    if (existing.rows.length) slug = `${slug}-${Date.now()}`;

    const result = await query(
      `INSERT INTO collections (name, slug, description, image_url, banner_url, show_on_homepage, meta_title, meta_description)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [name, slug, description, image_url, banner_url, show_on_homepage || false, meta_title, meta_description]
    );
    res.status(201).json({ collection: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create collection' });
  }
});

router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const { name, description, image_url, banner_url, show_on_homepage, is_active, meta_title, meta_description } = req.body;
    const result = await query(
      `UPDATE collections SET name=$1, description=$2, image_url=$3, banner_url=$4, show_on_homepage=$5, is_active=$6, meta_title=$7, meta_description=$8
       WHERE id=$9 RETURNING *`,
      [name, description, image_url, banner_url, show_on_homepage || false, is_active !== false, meta_title, meta_description, req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Collection not found' });
    res.json({ collection: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update collection' });
  }
});

router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    await query('DELETE FROM collections WHERE id=$1', [req.params.id]);
    res.json({ message: 'Collection deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete collection' });
  }
});

module.exports = router;
