const express = require('express');
const { query } = require('../config/database');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

// GET /api/inventory
router.get('/', requireAdmin, async (req, res) => {
  try {
    const result = await query(`
      SELECT p.id as product_id, p.name, p.slug, p.brand,
        (SELECT url FROM product_images WHERE product_id=p.id AND is_primary=true LIMIT 1) as image,
        json_agg(json_build_object(
          'id', pv.id, 'size_ml', pv.size_ml, 'sku', pv.sku,
          'quantity', pv.quantity, 'price', pv.price
        ) ORDER BY pv.size_ml) as variants,
        SUM(pv.quantity) as total_stock
      FROM products p
      JOIN product_variants pv ON p.id = pv.product_id
      WHERE pv.is_active = true
      GROUP BY p.id, p.name, p.slug, p.brand
      ORDER BY total_stock ASC
    `);
    res.json({ inventory: result.rows });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch inventory' });
  }
});

// GET /api/inventory/low-stock
router.get('/low-stock', requireAdmin, async (req, res) => {
  try {
    const result = await query(`
      SELECT p.name, pv.size_ml, pv.sku, pv.quantity
      FROM product_variants pv
      JOIN products p ON pv.product_id = p.id
      WHERE pv.quantity <= 10 AND pv.is_active = true
      ORDER BY pv.quantity ASC
      LIMIT 20
    `);
    res.json({ lowStock: result.rows });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch low stock items' });
  }
});

// PUT /api/inventory/:productId/:variantId
router.put('/:productId/:variantId', requireAdmin, async (req, res) => {
  try {
    const { quantity, note } = req.body;
    const current = await query('SELECT quantity FROM product_variants WHERE id=$1', [req.params.variantId]);
    if (!current.rows.length) return res.status(404).json({ error: 'Variant not found' });

    const oldQty = current.rows[0].quantity;
    const newQty = parseInt(quantity);

    await query('UPDATE product_variants SET quantity=$1, updated_at=NOW() WHERE id=$2', [newQty, req.params.variantId]);

    await query(
      `INSERT INTO inventory_log (variant_id, change_type, quantity_change, quantity_after, note)
       VALUES ($1,'adjustment',$2,$3,$4)`,
      [req.params.variantId, newQty - oldQty, newQty, note || 'Manual adjustment']
    );

    if (newQty <= 10) {
      await query(
        `INSERT INTO notifications (type, title, message, metadata)
         VALUES ('low_stock','Low Stock Alert',$1,$2)`,
        [`Variant ${req.params.variantId} is low (${newQty} left)`, JSON.stringify({ variant_id: req.params.variantId })]
      );
    }

    res.json({ message: 'Stock updated', quantity: newQty });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update stock' });
  }
});

module.exports = router;
