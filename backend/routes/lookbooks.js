const express = require('express');
const slugify = require('slugify');
const { query } = require('../config/database');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Ensure table exists on already-running databases (fresh installs get it from schema.sql)
async function ensureLookbooksTable() {
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS lookbooks (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        slug VARCHAR(255) UNIQUE NOT NULL,
        subtitle VARCHAR(255),
        excerpt TEXT,
        cover_image_url TEXT,
        sections JSONB DEFAULT '[]',
        product_ids JSONB DEFAULT '[]',
        is_published BOOLEAN DEFAULT false,
        position INT DEFAULT 0,
        meta_title VARCHAR(255),
        meta_description TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
  } catch (e) {
    console.error('lookbooks migration:', e.message);
  }
}
ensureLookbooksTable();

// Resolve product_ids -> full product cards (same shape as the shop list) for "Shop the Look"
async function resolveProducts(productIds) {
  const ids = Array.isArray(productIds) ? productIds.filter(Boolean) : [];
  if (!ids.length) return [];
  const result = await query(
    `SELECT p.*,
      COALESCE(p.average_rating,0) AS average_rating,
      (SELECT json_agg(pi ORDER BY pi.position) FROM product_images pi WHERE pi.product_id=p.id) AS images,
      (SELECT json_agg(pi) FROM product_images pi WHERE pi.product_id=p.id AND pi.is_primary=true LIMIT 1) AS primary_image,
      (SELECT json_agg(pv ORDER BY pv.size_ml) FROM product_variants pv WHERE pv.product_id=p.id AND pv.is_active=true) AS variants
     FROM products p WHERE p.id = ANY($1::int[])`,
    [ids]
  );
  // Preserve the admin-selected order rather than DB order
  const byId = {};
  result.rows.forEach((row) => { byId[row.id] = row; });
  return ids.map((id) => byId[id]).filter(Boolean);
}

// GET /api/lookbooks  (public — published only)
router.get('/', async (req, res) => {
  try {
    const result = await query(
      'SELECT * FROM lookbooks WHERE is_published = true ORDER BY position ASC, created_at DESC'
    );
    res.json({ lookbooks: result.rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch lookbooks' });
  }
});

// GET /api/lookbooks/admin  (admin — all, including drafts)
router.get('/admin', requireAdmin, async (req, res) => {
  try {
    const result = await query('SELECT * FROM lookbooks ORDER BY position ASC, created_at DESC');
    res.json({ lookbooks: result.rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch lookbooks' });
  }
});

// GET /api/lookbooks/:slug  (public — single, with shop-the-look products resolved)
router.get('/:slug', async (req, res) => {
  try {
    const result = await query('SELECT * FROM lookbooks WHERE slug = $1', [req.params.slug]);
    if (!result.rows.length) return res.status(404).json({ error: 'Lookbook not found' });
    const lookbook = result.rows[0];
    const products = await resolveProducts(lookbook.product_ids);
    res.json({ lookbook, products });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch lookbook' });
  }
});

// POST /api/lookbooks  (admin)
router.post('/', requireAdmin, async (req, res) => {
  try {
    const {
      title, subtitle, excerpt, cover_image_url,
      sections, product_ids, is_published, position,
      meta_title, meta_description,
    } = req.body;
    if (!title) return res.status(400).json({ error: 'Title is required' });

    let slug = slugify(title, { lower: true, strict: true });
    const existing = await query('SELECT id FROM lookbooks WHERE slug=$1', [slug]);
    if (existing.rows.length) slug = `${slug}-${Date.now()}`;

    const result = await query(
      `INSERT INTO lookbooks
        (title, slug, subtitle, excerpt, cover_image_url, sections, product_ids, is_published, position, meta_title, meta_description)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [
        title, slug, subtitle || null, excerpt || null, cover_image_url || null,
        JSON.stringify(sections || []), JSON.stringify(product_ids || []),
        is_published || false, position || 0, meta_title || null, meta_description || null,
      ]
    );
    res.status(201).json({ lookbook: result.rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create lookbook' });
  }
});

// PUT /api/lookbooks/:id  (admin)
router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const {
      title, subtitle, excerpt, cover_image_url,
      sections, product_ids, is_published, position,
      meta_title, meta_description,
    } = req.body;

    const result = await query(
      `UPDATE lookbooks SET
        title=COALESCE($1,title),
        subtitle=$2, excerpt=$3, cover_image_url=$4,
        sections=COALESCE($5,sections), product_ids=COALESCE($6,product_ids),
        is_published=COALESCE($7,is_published), position=COALESCE($8,position),
        meta_title=$9, meta_description=$10, updated_at=NOW()
       WHERE id=$11 RETURNING *`,
      [
        title || null, subtitle || null, excerpt || null, cover_image_url || null,
        sections !== undefined ? JSON.stringify(sections) : null,
        product_ids !== undefined ? JSON.stringify(product_ids) : null,
        is_published, position,
        meta_title || null, meta_description || null,
        req.params.id,
      ]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Lookbook not found' });
    res.json({ lookbook: result.rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update lookbook' });
  }
});

// DELETE /api/lookbooks/:id  (admin)
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    await query('DELETE FROM lookbooks WHERE id=$1', [req.params.id]);
    res.json({ message: 'Lookbook deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete lookbook' });
  }
});

module.exports = router;
