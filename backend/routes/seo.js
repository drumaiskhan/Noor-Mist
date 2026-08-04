const express = require('express');
const { query } = require('../config/database');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

router.get('/', requireAdmin, async (req, res) => {
  try {
    const result = await query('SELECT * FROM seo_settings ORDER BY page_path ASC');
    res.json({ seoSettings: result.rows });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch SEO settings' });
  }
});

router.get('/:path(*)', async (req, res) => {
  try {
    const pagePath = '/' + req.params.path;
    const result = await query('SELECT * FROM seo_settings WHERE page_path=$1', [pagePath]);
    res.json({ seo: result.rows[0] || null });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch SEO data' });
  }
});

router.put('/:path(*)', requireAdmin, async (req, res) => {
  try {
    const pagePath = '/' + req.params.path;
    const { title, description, keywords, og_title, og_description, og_image } = req.body;
    const result = await query(
      `INSERT INTO seo_settings (page_path, title, description, keywords, og_title, og_description, og_image)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       ON CONFLICT (page_path) DO UPDATE SET
         title=EXCLUDED.title, description=EXCLUDED.description, keywords=EXCLUDED.keywords,
         og_title=EXCLUDED.og_title, og_description=EXCLUDED.og_description, og_image=EXCLUDED.og_image,
         updated_at=NOW()
       RETURNING *`,
      [pagePath, title, description, keywords, og_title, og_description, og_image]
    );
    res.json({ seo: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update SEO' });
  }
});

// GET /api/seo/sitemap — generate XML sitemap
router.get('/sitemap', async (req, res) => {
  try {
    const products = await query('SELECT slug, updated_at FROM products WHERE is_visible=true');
    const baseUrl = process.env.SITE_URL || 'https://noormist.com';
    const staticPages = ['/', '/shop', '/about', '/contact', '/faq'];
    const now = new Date().toISOString().split('T')[0];

    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;
    for (const p of staticPages) {
      xml += `  <url><loc>${baseUrl}${p}</loc><lastmod>${now}</lastmod><changefreq>weekly</changefreq><priority>0.8</priority></url>\n`;
    }
    for (const p of products.rows) {
      const d = p.updated_at ? new Date(p.updated_at).toISOString().split('T')[0] : now;
      xml += `  <url><loc>${baseUrl}/product/${p.slug}</loc><lastmod>${d}</lastmod><changefreq>weekly</changefreq><priority>0.6</priority></url>\n`;
    }
    xml += `</urlset>`;
    res.set('Content-Type', 'application/xml').send(xml);
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate sitemap' });
  }
});

module.exports = router;
