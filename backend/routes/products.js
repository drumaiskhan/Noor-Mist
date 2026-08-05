const express = require('express');
const slugify = require('slugify');
const { query } = require('../config/database');
const { authenticate, requireAdmin, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// Build product query with filters
function buildProductQuery(params) {
  const conditions = ['p.is_visible = true'];
  const values = [];
  let idx = 1;

  if (params.gender) { conditions.push(`p.gender = $${idx++}`); values.push(params.gender); }
  if (params.fragrance_family) { conditions.push(`p.fragrance_family = $${idx++}`); values.push(params.fragrance_family); }
  if (params.concentration) { conditions.push(`p.concentration = $${idx++}`); values.push(params.concentration); }
  if (params.category_id) { conditions.push(`p.category_id = $${idx++}`); values.push(params.category_id); }
  if (params.collection_id) { conditions.push(`p.collection_id = $${idx++}`); values.push(params.collection_id); }
  if (params.collection) {
    // Shop.jsx passes the collection's slug (not its id). A collection can also
    // carry a gender tag (e.g. "Men's Collection"), in which case it should
    // automatically include every product of that gender — not just the ones
    // an admin manually assigned to it via collection_id.
    conditions.push(`(
      p.collection_id = (SELECT id FROM collections WHERE slug = $${idx})
      OR p.gender = (SELECT gender FROM collections WHERE slug = $${idx} AND gender IS NOT NULL)
    )`);
    values.push(params.collection);
    idx += 1;
  }
  if (params.featured === 'true') { conditions.push('p.is_featured = true'); }
  if (params.bestseller === 'true') { conditions.push('p.is_bestseller = true'); }
  if (params.new_arrival === 'true') { conditions.push('p.is_new_arrival = true'); }
  if (params.limited_edition === 'true') { conditions.push('p.is_limited_edition = true'); }
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

    const { conditions, values, orderBy, idx } = buildProductQuery(req.query);
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await query(
      `SELECT COUNT(*) FROM products p ${where}`,
      values
    );

    const total = parseInt(countResult.rows[0].count);


    const result = await query(
`
SELECT

p.*,


-- Category name
c.name AS category_name,


-- Minimum product price
(
  SELECT MIN(COALESCE(pv.sale_price,pv.price))
  FROM product_variants pv
  WHERE pv.product_id = p.id
  AND pv.is_active = true
) AS min_price,


-- Total available stock
(
  SELECT COALESCE(SUM(pv.quantity),0)
  FROM product_variants pv
  WHERE pv.product_id = p.id
  AND pv.is_active = true
) AS total_stock,


-- Total sales
(
  SELECT COALESCE(SUM(oi.quantity),0)
  FROM order_items oi
  WHERE oi.product_id = p.id
) AS total_sold,


-- Rating
COALESCE(p.average_rating,0) AS average_rating,


-- Status
CASE
 WHEN p.is_visible = true
 THEN 'published'
 ELSE 'draft'
END AS status,



-- Images
(
 SELECT json_agg(pi ORDER BY pi.position)
 FROM product_images pi
 WHERE pi.product_id=p.id
) AS images,



-- Variants
(
 SELECT json_agg(pv ORDER BY pv.size_ml)
 FROM product_variants pv
 WHERE pv.product_id=p.id
 AND pv.is_active=true
) AS variants,



-- Primary image
(
 SELECT json_agg(pi)
 FROM product_images pi
 WHERE pi.product_id=p.id
 AND pi.is_primary=true
 LIMIT 1
) AS primary_image



FROM products p


LEFT JOIN categories c
ON c.id=p.category_id



${where}


ORDER BY ${orderBy}


LIMIT $${idx}
OFFSET $${idx + 1}

`,
[
...values,
limit,
offset
]
);



res.json({

products: result.rows,

total,

page,

pages: Math.ceil(total / limit),

limit

});


  } catch(error) {

    console.error("PRODUCT FETCH ERROR:",error);

    res.status(500).json({
      error:"Failed to fetch products"
    });

  }
});
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

// GET /api/products/id/:id (admin — fetch by numeric id, used by the edit
// screen. Unlike the public /:slug route below, this does NOT require
// is_visible=true, so draft/archived products can still be opened for editing.)
router.get('/id/:id', requireAdmin, async (req, res) => {
  try {
    const result = await query(
      `SELECT p.*,
        (SELECT json_agg(pi ORDER BY pi.position) FROM product_images pi WHERE pi.product_id = p.id) AS images,
        (SELECT json_agg(pv ORDER BY pv.size_ml) FROM product_variants pv WHERE pv.product_id = p.id) AS variants
       FROM products p
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

// Insert/sync the variants + images the admin form submits alongside a
// product. The form always sends the *full* current lists, so:
//  - a variant row with an `id` is an existing row → UPDATE it
//  - a variant row with no `id` is new → INSERT it
//  - any existing variant not present in the submitted list was removed
//    in the form → soft-delete it (is_active=false) rather than a hard
//    delete, since past orders may still reference it
//  - images are simpler: the whole set is replaced, first one is primary
async function syncVariants(productId, variants, slug) {
  const submittedIds = [];
  for (const v of variants || []) {
    const sizeMl = parseInt(v.size_ml) || 0;
    const price = parseFloat(v.price) || 0;
    if (!sizeMl || !price) continue; // skip incomplete rows rather than fail the whole save
    const salePrice = v.sale_price ? parseFloat(v.sale_price) : null;
    const quantity = parseInt(v.quantity) || 0;
    const sku = (v.sku && v.sku.trim()) || `${(slug || 'NM').toUpperCase().slice(0, 8)}-${sizeMl}ML-${Date.now()}`;

    if (v.id) {
      const updated = await query(
        `UPDATE product_variants SET size_ml=$1, price=$2, sale_price=$3, sku=$4, quantity=$5,
          is_active=true, updated_at=NOW()
         WHERE id=$6 AND product_id=$7 RETURNING id`,
        [sizeMl, price, salePrice, sku, quantity, v.id, productId]
      );
      if (updated.rows.length) submittedIds.push(updated.rows[0].id);
    } else {
      const inserted = await query(
        `INSERT INTO product_variants (product_id, size_ml, price, sale_price, sku, quantity)
         VALUES ($1,$2,$3,$4,$5,$6)
         ON CONFLICT (sku) DO UPDATE SET size_ml=EXCLUDED.size_ml, price=EXCLUDED.price,
           sale_price=EXCLUDED.sale_price, quantity=EXCLUDED.quantity, is_active=true
         RETURNING id`,
        [productId, sizeMl, price, salePrice, sku, quantity]
      );
      submittedIds.push(inserted.rows[0].id);
    }
  }

  if (submittedIds.length) {
    await query(
      `UPDATE product_variants SET is_active=false WHERE product_id=$1 AND id != ALL($2::int[])`,
      [productId, submittedIds]
    );
  }
}

async function syncImages(productId, images) {
  if (!images) return; // undefined = form didn't touch images, leave as-is
  await query('DELETE FROM product_images WHERE product_id=$1', [productId]);
  let position = 0;
  for (const img of images) {
    const url = typeof img === 'string' ? img : img.url;
    if (!url) continue;
    const publicId = typeof img === 'string' ? null : img.public_id || null;
    await query(
      `INSERT INTO product_images (product_id, url, public_id, is_primary, position)
       VALUES ($1,$2,$3,$4,$5)`,
      [productId, url, publicId, position === 0, position]
    );
    position += 1;
  }
}

// POST /api/products (admin)
router.post('/', requireAdmin, async (req, res) => {
  try {
    const {
      name, description, short_description, brand, fragrance_family, concentration,
      gender, top_notes, middle_notes, base_notes, longevity, projection, season, occasion,
      category_id, collection_id, is_featured, is_bestseller, is_new_arrival,
      is_limited_edition, is_gift_set, is_visible, meta_title, meta_description,
      variants, images,
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

    const product = result.rows[0];
    await syncVariants(product.id, variants, slug);
    await syncImages(product.id, images);

    res.status(201).json({ product });
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
       meta_title, meta_description, req.params.id]
    );

    if (!result.rows.length) return res.status(404).json({ error: 'Product not found' });
    const product = result.rows[0];

    await syncVariants(product.id, variants, product.slug);
    await syncImages(product.id, images);

    res.json({ product });
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
