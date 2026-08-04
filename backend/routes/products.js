const express = require('express');
const slugify = require('slugify');
const { query } = require('../config/database');
const { authenticate, requireAdmin, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// Build product query with filters
function buildProductQuery(params, isAdmin = false) {
  const conditions = isAdmin ? [] : ['p.is_visible = true'];
  const values = [];
  let idx = 1;

  if (params.gender) { conditions.push(`p.gender = $${idx++}`); values.push(params.gender); }
  if (params.fragrance_family) { conditions.push(`p.fragrance_family = $${idx++}`); values.push(params.fragrance_family); }
  if (params.concentration) { conditions.push(`p.concentration = $${idx++}`); values.push(params.concentration); }
  if (params.category_id) { conditions.push(`p.category_id = $${idx++}`); values.push(params.category_id); }
  if (params.collection_id) { conditions.push(`p.collection_id = $${idx++}`); values.push(params.collection_id); }
  if (params.featured === 'true') { conditions.push('p.is_featured = true'); }
  if (params.bestseller === 'true') { conditions.push('p.is_bestseller = true'); }
  if (params.new_arrival === 'true') { conditions.push('p.is_new_arrival = true'); }
  if (params.limited_edition === 'true') { conditions.push('p.is_limited_edition = true'); }
  if (params.status && params.status !== 'all') {
    conditions.push(`p.status = $${idx++}`);
    values.push(params.status);
  }
  if (params.search) {
    conditions.push(`(p.name ILIKE $${idx} OR p.brand ILIKE $${idx} OR p.description ILIKE $${idx})`);
    values.push(`%${params.search}%`);
    idx += 1;
  }
  if (params.minPrice) {
    conditions.push(`EXISTS (SELECT 1 FROM product_variants pv WHERE pv.product_id = p.id AND COALESCE(pv.sale_price, pv.price) >= $${idx++})`);
    values.push(params.minPrice);
  }
  if (params.maxPrice) {
    conditions.push(`EXISTS (SELECT 1 FROM product_variants pv WHERE pv.product_id = p.id AND COALESCE(pv.sale_price, pv.price) <= $${idx++})`);
    values.push(params.maxPrice);
  }

  let orderBy = 'p.created_at DESC';
  if (params.sort === 'bestselling') orderBy = 'p.total_sold DESC';
  else if (params.sort === 'price_asc') orderBy = '(SELECT MIN(COALESCE(pv.sale_price, pv.price)) FROM product_variants pv WHERE pv.product_id = p.id) ASC';
  else if (params.sort === 'price_desc') orderBy = '(SELECT MIN(COALESCE(pv.sale_price, pv.price)) FROM product_variants pv WHERE pv.product_id = p.id) DESC';
  else if (params.sort === 'rating') orderBy = 'p.average_rating DESC';
  else if (params.sort === 'alphabetical') orderBy = 'p.name ASC';

  return { conditions, values, orderBy, idx };
}

// GET /api/products
router.get('/', optionalAuth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 24, 100);
    const offset = (page - 1) * limit;

    // Admin requests can see all products regardless of visibility
    const isAdmin = req.user?.role === 'admin';
    const { conditions, values, orderBy, idx } = buildProductQuery(req.query, isAdmin);
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await query(
      `SELECT COUNT(*) FROM products p ${where}`,
      values
    );
    const total = parseInt(countResult.rows[0].count);

    const result = await query(
      `SELECT p.*,
        c.name AS category_name,
        (SELECT MIN(COALESCE(pv.sale_price, pv.price)) FROM product_variants pv WHERE pv.product_id = p.id AND pv.is_active = true) AS min_price,
        (SELECT COALESCE(SUM(pv.quantity), 0) FROM product_variants pv WHERE pv.product_id = p.id AND pv.is_active = true) AS total_stock,
        (SELECT json_agg(pv ORDER BY pv.size_ml) FROM product_variants pv WHERE pv.product_id = p.id AND pv.is_active = true) AS variants,
        (SELECT json_agg(pi) FROM product_images pi WHERE pi.product_id = p.id AND pi.is_primary = true LIMIT 1) AS primary_image
       FROM products p
       LEFT JOIN categories c ON p.category_id = c.id
       ${where}
       ORDER BY ${orderBy}
       LIMIT $${idx} OFFSET $${idx + 1}`,
      [...values, limit, offset]
    );

    res.json({
      products: result.rows,
      total,
      page,
      pages: Math.ceil(total / limit),
      limit,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// ── XML helpers ──────────────────────────────────────────────────────────────
function esc(v) {
  return String(v ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
function xmlTag(tag, val) { return `<${tag}>${esc(val)}</${tag}>`; }
function getTag(xml, tag) {
  const m = xml.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`));
  return m ? m[1].trim() : '';
}
function getAllTags(xml, tag) {
  const re = new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, 'g');
  const out = []; let m;
  while ((m = re.exec(xml)) !== null) out.push(m[1].trim());
  return out;
}

// GET /api/products/export-xml (admin)
router.get('/export-xml', requireAdmin, async (req, res) => {
  try {
    const products = await query(
      `SELECT p.*,
         (SELECT json_agg(pv ORDER BY pv.size_ml) FROM product_variants pv WHERE pv.product_id = p.id) AS variants,
         (SELECT json_agg(pi ORDER BY pi.position) FROM product_images pi WHERE pi.product_id = p.id) AS images
       FROM products p ORDER BY p.created_at DESC`
    );

    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<products>\n';
    for (const p of products.rows) {
      xml += '  <product>\n';
      xml += `    ${xmlTag('name', p.name)}\n`;
      xml += `    ${xmlTag('slug', p.slug)}\n`;
      xml += `    ${xmlTag('brand', p.brand)}\n`;
      xml += `    ${xmlTag('description', p.description)}\n`;
      xml += `    ${xmlTag('short_description', p.short_description)}\n`;
      xml += `    ${xmlTag('fragrance_family', p.fragrance_family)}\n`;
      xml += `    ${xmlTag('concentration', p.concentration)}\n`;
      xml += `    ${xmlTag('gender', p.gender)}\n`;
      xml += `    ${xmlTag('top_notes', (p.top_notes || []).join(','))}\n`;
      xml += `    ${xmlTag('middle_notes', (p.middle_notes || []).join(','))}\n`;
      xml += `    ${xmlTag('base_notes', (p.base_notes || []).join(','))}\n`;
      xml += `    ${xmlTag('longevity', p.longevity)}\n`;
      xml += `    ${xmlTag('projection', p.projection)}\n`;
      xml += `    ${xmlTag('season', (p.season || []).join(','))}\n`;
      xml += `    ${xmlTag('occasion', (p.occasion || []).join(','))}\n`;
      xml += `    ${xmlTag('is_featured', p.is_featured)}\n`;
      xml += `    ${xmlTag('is_bestseller', p.is_bestseller)}\n`;
      xml += `    ${xmlTag('is_new_arrival', p.is_new_arrival)}\n`;
      xml += `    ${xmlTag('is_limited_edition', p.is_limited_edition)}\n`;
      xml += `    ${xmlTag('is_gift_set', p.is_gift_set)}\n`;
      xml += `    ${xmlTag('is_visible', p.is_visible)}\n`;
      xml += `    ${xmlTag('meta_title', p.meta_title)}\n`;
      xml += `    ${xmlTag('meta_description', p.meta_description)}\n`;
      if (p.variants && p.variants.length) {
        xml += '    <variants>\n';
        for (const v of p.variants) {
          xml += '      <variant>\n';
          xml += `        ${xmlTag('size_ml', v.size_ml)}\n`;
          xml += `        ${xmlTag('price', v.price)}\n`;
          xml += `        ${xmlTag('sale_price', v.sale_price ?? '')}\n`;
          xml += `        ${xmlTag('sku', v.sku)}\n`;
          xml += `        ${xmlTag('barcode', v.barcode ?? '')}\n`;
          xml += `        ${xmlTag('weight_g', v.weight_g ?? '')}\n`;
          xml += `        ${xmlTag('quantity', v.quantity)}\n`;
          xml += '      </variant>\n';
        }
        xml += '    </variants>\n';
      }
      if (p.images && p.images.length) {
        xml += '    <images>\n';
        for (const img of p.images) {
          xml += `      <image>${esc(img.url)}</image>\n`;
        }
        xml += '    </images>\n';
      }
      xml += '  </product>\n';
    }
    xml += '</products>';

    res.setHeader('Content-Type', 'application/xml');
    res.setHeader('Content-Disposition', `attachment; filename="noor-mist-products-${Date.now()}.xml"`);
    res.send(xml);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to export products' });
  }
});

// POST /api/products/import-xml (admin)
router.post('/import-xml', requireAdmin, async (req, res) => {
  try {
    const xmlText = req.body.xml;
    if (!xmlText) return res.status(400).json({ error: 'XML body required' });

    const productBlocks = getAllTags(xmlText, 'product');
    const results = { created: 0, skipped: 0, errors: [] };

    for (const block of productBlocks) {
      try {
        const name = getTag(block, 'name');
        if (!name) { results.errors.push('Product with no name skipped'); continue; }

        let slug = slugify(name, { lower: true, strict: true });
        const existing = await query('SELECT id FROM products WHERE slug = $1', [slug]);
        if (existing.rows.length) { slug = `${slug}-${Date.now()}`; }

        const notesArr = (s) => s ? s.split(',').map(x => x.trim()).filter(Boolean) : [];
        const bool = (s) => s === 'true' || s === '1';

        const inserted = await query(
          `INSERT INTO products (name, slug, brand, description, short_description,
             fragrance_family, concentration, gender,
             top_notes, middle_notes, base_notes, longevity, projection,
             season, occasion, is_featured, is_bestseller, is_new_arrival,
             is_limited_edition, is_gift_set, is_visible, meta_title, meta_description)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23)
           RETURNING id`,
          [
            name, slug,
            getTag(block,'brand'), getTag(block,'description'), getTag(block,'short_description'),
            getTag(block,'fragrance_family'), getTag(block,'concentration'), getTag(block,'gender') || 'unisex',
            notesArr(getTag(block,'top_notes')),
            notesArr(getTag(block,'middle_notes')),
            notesArr(getTag(block,'base_notes')),
            getTag(block,'longevity'), getTag(block,'projection'),
            notesArr(getTag(block,'season')),
            notesArr(getTag(block,'occasion')),
            bool(getTag(block,'is_featured')),
            bool(getTag(block,'is_bestseller')),
            getTag(block,'is_new_arrival') !== 'false',
            bool(getTag(block,'is_limited_edition')),
            bool(getTag(block,'is_gift_set')),
            getTag(block,'is_visible') !== 'false',
            getTag(block,'meta_title'), getTag(block,'meta_description'),
          ]
        );
        const productId = inserted.rows[0].id;

        // Variants
        const variantBlocks = getAllTags(block, 'variant');
        for (const vb of variantBlocks) {
          const sizeMl = parseInt(getTag(vb,'size_ml'));
          const price = parseFloat(getTag(vb,'price'));
          if (!sizeMl || !price) continue;
          const sku = getTag(vb,'sku') || `${slug.toUpperCase().slice(0,8)}-${sizeMl}ML-${Date.now()}`;
          await query(
            `INSERT INTO product_variants (product_id, size_ml, price, sale_price, sku, barcode, weight_g, quantity)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT (sku) DO NOTHING`,
            [productId, sizeMl, price,
             parseFloat(getTag(vb,'sale_price')) || null,
             sku,
             getTag(vb,'barcode') || null,
             parseFloat(getTag(vb,'weight_g')) || null,
             parseInt(getTag(vb,'quantity')) || 0]
          );
        }

        // Images
        const imageUrls = getAllTags(block, 'image');
        for (let i = 0; i < imageUrls.length; i++) {
          await query(
            `INSERT INTO product_images (product_id, url, is_primary, position) VALUES ($1,$2,$3,$4)`,
            [productId, imageUrls[i], i === 0, i]
          );
        }

        results.created++;
      } catch (err) {
        results.errors.push(`Error importing product: ${err.message}`);
      }
    }

    res.json({ message: `Import complete`, ...results });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to import products' });
  }
});

// GET /api/products/admin/:id — fetch a single product by numeric ID for admin editing
router.get('/admin/:id', requireAdmin, async (req, res) => {
  try {
    const result = await query(
      `SELECT p.*,
        (SELECT json_agg(pi ORDER BY pi.position) FROM product_images pi WHERE pi.product_id = p.id) AS images,
        (SELECT json_agg(pv ORDER BY pv.size_ml) FROM product_variants pv WHERE pv.product_id = p.id) AS variants,
        c.name AS category_name, c.slug AS category_slug
       FROM products p
       LEFT JOIN categories c ON p.category_id = c.id
       WHERE p.id = $1`,
      [req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Product not found' });
    res.json({ product: result.rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch product' });
  }
});

// GET /api/products/:slug
router.get('/:slug', optionalAuth, async (req, res) => {
  try {
    const result = await query(
      `SELECT p.*,
        (SELECT json_agg(pi ORDER BY pi.position) FROM product_images pi WHERE pi.product_id = p.id) AS images,
        (SELECT json_agg(pv ORDER BY pv.size_ml) FROM product_variants pv WHERE pv.product_id = p.id AND pv.is_active = true) AS variants,
        (SELECT json_agg(pi) FROM product_images pi WHERE pi.product_id = p.id AND pi.is_primary = true LIMIT 1) AS primary_image,
        c.name AS category_name, c.slug AS category_slug
       FROM products p
       LEFT JOIN categories c ON p.category_id = c.id
       WHERE p.slug = $1 AND p.is_visible = true`,
      [req.params.slug]
    );

    if (!result.rows.length) return res.status(404).json({ error: 'Product not found' });

    const product = result.rows[0];

    // Related products
    const related = await query(
      `SELECT p.id, p.name, p.slug, p.fragrance_family, p.brand, p.average_rating,
        (SELECT json_agg(pi) FROM product_images pi WHERE pi.product_id = p.id AND pi.is_primary = true LIMIT 1) AS primary_image,
        (SELECT json_agg(pv ORDER BY pv.size_ml) FROM product_variants pv WHERE pv.product_id = p.id AND pv.is_active = true) AS variants
       FROM products p
       WHERE p.id != $1 AND (p.fragrance_family = $2 OR p.category_id = $3) AND p.is_visible = true
       ORDER BY RANDOM() LIMIT 4`,
      [product.id, product.fragrance_family, product.category_id]
    );

    res.json({ product, related: related.rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch product' });
  }
});

// POST /api/products (admin)
router.post('/', requireAdmin, async (req, res) => {
  try {
    const {
      name, description, short_description, brand, fragrance_family, concentration,
      gender, top_notes, middle_notes, base_notes, longevity, projection, season, occasion,
      category_id, collection_id, is_featured, is_bestseller, is_new_arrival,
      is_limited_edition, is_gift_set, is_visible, meta_title, meta_description,
    } = req.body;

    let slug = slugify(name, { lower: true, strict: true });
    const existing = await query('SELECT id FROM products WHERE slug = $1', [slug]);
    if (existing.rows.length) slug = `${slug}-${Date.now()}`;

    const result = await query(
      `INSERT INTO products (name, slug, description, short_description, brand, fragrance_family,
        concentration, gender, top_notes, middle_notes, base_notes, longevity, projection,
        season, occasion, category_id, collection_id, is_featured, is_bestseller, is_new_arrival,
        is_limited_edition, is_gift_set, is_visible, meta_title, meta_description)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25)
       RETURNING *`,
      [name, slug, description, short_description, brand, fragrance_family, concentration,
       gender, top_notes || [], middle_notes || [], base_notes || [], longevity, projection,
       season || [], occasion || [], category_id || null, collection_id || null,
       is_featured || false, is_bestseller || false, is_new_arrival !== false,
       is_limited_edition || false, is_gift_set || false, is_visible !== false,
       meta_title, meta_description]
    );

    res.status(201).json({ product: result.rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create product' });
  }
});

// PUT /api/products/:id (admin)
router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const {
      name, description, short_description, brand, fragrance_family, concentration,
      gender, top_notes, middle_notes, base_notes, longevity, projection, season, occasion,
      category_id, collection_id, is_featured, is_bestseller, is_new_arrival,
      is_limited_edition, is_gift_set, is_visible, meta_title, meta_description,
      variants, images,
    } = req.body;

    const productId = req.params.id;

    const result = await query(
      `UPDATE products SET name=$1, description=$2, short_description=$3, brand=$4,
        fragrance_family=$5, concentration=$6, gender=$7, top_notes=$8, middle_notes=$9,
        base_notes=$10, longevity=$11, projection=$12, season=$13, occasion=$14,
        category_id=$15, collection_id=$16, is_featured=$17, is_bestseller=$18,
        is_new_arrival=$19, is_limited_edition=$20, is_gift_set=$21, is_visible=$22,
        meta_title=$23, meta_description=$24, updated_at=NOW()
       WHERE id=$25 RETURNING *`,
      [name, description, short_description, brand, fragrance_family, concentration,
       gender, top_notes || [], middle_notes || [], base_notes || [], longevity, projection,
       season || [], occasion || [], category_id || null, collection_id || null,
       is_featured || false, is_bestseller || false, is_new_arrival !== false,
       is_limited_edition || false, is_gift_set || false, is_visible !== false,
       meta_title, meta_description, productId]
    );

    if (!result.rows.length) return res.status(404).json({ error: 'Product not found' });

    // Upsert variants if provided
    if (Array.isArray(variants)) {
      for (const v of variants) {
        if (v.id) {
          // Update existing variant
          await query(
            `UPDATE product_variants SET size_ml=$1, price=$2, sale_price=$3, sku=$4,
              quantity=$5, updated_at=NOW()
             WHERE id=$6 AND product_id=$7`,
            [v.size_ml, parseFloat(v.price) || 0, v.sale_price ? parseFloat(v.sale_price) : null,
             v.sku || null, parseInt(v.quantity) || 0, v.id, productId]
          );
        } else {
          // Insert new variant
          const sku = v.sku || `${productId}-${v.size_ml}ML-${Date.now()}`;
          await query(
            `INSERT INTO product_variants (product_id, size_ml, price, sale_price, sku, quantity)
             VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (sku) DO UPDATE SET
             size_ml=EXCLUDED.size_ml, price=EXCLUDED.price, sale_price=EXCLUDED.sale_price,
             quantity=EXCLUDED.quantity, updated_at=NOW()`,
            [productId, v.size_ml, parseFloat(v.price) || 0,
             v.sale_price ? parseFloat(v.sale_price) : null,
             sku, parseInt(v.quantity) || 0]
          );
        }
      }
    }

    // Sync images if provided: insert any new image URLs not already in the DB
    if (Array.isArray(images) && images.length > 0) {
      for (let i = 0; i < images.length; i++) {
        const img = images[i];
        const url = img.url || img;
        if (!url) continue;
        await query(
          `INSERT INTO product_images (product_id, url, public_id, is_primary, position)
           VALUES ($1,$2,$3,$4,$5)
           ON CONFLICT DO NOTHING`,
          [productId, url, img.public_id || null, i === 0, i]
        ).catch(() => {}); // ignore conflicts gracefully
      }
    }

    res.json({ product: result.rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update product' });
  }
});

// DELETE /api/products/:id (admin)
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    await query('DELETE FROM products WHERE id = $1', [req.params.id]);
    res.json({ message: 'Product deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

// POST /api/products/:id/variants (admin)
router.post('/:id/variants', requireAdmin, async (req, res) => {
  try {
    const { size_ml, price, sale_price, sku, barcode, weight_g, quantity } = req.body;
    const result = await query(
      `INSERT INTO product_variants (product_id, size_ml, price, sale_price, sku, barcode, weight_g, quantity)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [req.params.id, size_ml, price, sale_price || null, sku, barcode, weight_g, quantity || 0]
    );
    res.status(201).json({ variant: result.rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create variant' });
  }
});

// PUT /api/products/:id/variants/:variantId (admin)
router.put('/:id/variants/:variantId', requireAdmin, async (req, res) => {
  try {
    const { size_ml, price, sale_price, sku, barcode, weight_g, quantity, is_active } = req.body;
    const result = await query(
      `UPDATE product_variants SET size_ml=$1, price=$2, sale_price=$3, sku=$4, barcode=$5,
        weight_g=$6, quantity=$7, is_active=$8, updated_at=NOW()
       WHERE id=$9 AND product_id=$10 RETURNING *`,
      [size_ml, price, sale_price || null, sku, barcode, weight_g, quantity, is_active !== false, req.params.variantId, req.params.id]
    );
    res.json({ variant: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update variant' });
  }
});

// DELETE /api/products/:id/variants/:variantId (admin)
router.delete('/:id/variants/:variantId', requireAdmin, async (req, res) => {
  try {
    await query('DELETE FROM product_variants WHERE id=$1 AND product_id=$2', [req.params.variantId, req.params.id]);
    res.json({ message: 'Variant deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete variant' });
  }
});

// POST /api/products/:id/images (admin)
router.post('/:id/images', requireAdmin, async (req, res) => {
  try {
    const { url, public_id, alt_text, is_primary } = req.body;
    if (is_primary) {
      await query('UPDATE product_images SET is_primary=false WHERE product_id=$1', [req.params.id]);
    }
    const result = await query(
      `INSERT INTO product_images (product_id, url, public_id, alt_text, is_primary, position)
       VALUES ($1,$2,$3,$4,$5, (SELECT COALESCE(MAX(position),0)+1 FROM product_images WHERE product_id=$1))
       RETURNING *`,
      [req.params.id, url, public_id, alt_text, is_primary || false]
    );
    res.status(201).json({ image: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: 'Failed to add image' });
  }
});

// DELETE /api/products/:id/images/:imageId (admin)
router.delete('/:id/images/:imageId', requireAdmin, async (req, res) => {
  try {
    await query('DELETE FROM product_images WHERE id=$1 AND product_id=$2', [req.params.imageId, req.params.id]);
    res.json({ message: 'Image deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete image' });
  }
});

module.exports = router;
