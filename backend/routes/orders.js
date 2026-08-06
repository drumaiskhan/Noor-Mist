const express = require('express');
const { query } = require('../config/database');
const { authenticate, requireAdmin, optionalAuth } = require('../middleware/auth');
const { sendOrderConfirmation } = require('../services/email');

const router = express.Router();

function generateOrderNumber() {
  return `NM-${Date.now().toString(36).toUpperCase()}`;
}

// POST /api/orders — Create order
router.post('/', optionalAuth, async (req, res) => {
  const client = require('../config/database').getClient ? await require('../config/database').pool.connect() : null;
  try {
    const { items, shipping_address, payment_method, coupon_code, notes } = req.body;
    if (!items || items.length === 0) return res.status(400).json({ error: 'No items in order' });

    // Get fresh prices and validate stock
    let subtotal = 0;
    const orderItems = [];
    for (const item of items) {
      const varResult = await query(
        `SELECT pv.*, p.name as product_name,
          (SELECT url FROM product_images WHERE product_id=p.id AND is_primary=true LIMIT 1) as product_image
         FROM product_variants pv JOIN products p ON pv.product_id = p.id
         WHERE pv.id = $1 AND pv.is_active = true`,
        [item.variant_id]
      );
      if (!varResult.rows.length) return res.status(400).json({ error: `Invalid variant ${item.variant_id}` });
      const v = varResult.rows[0];
      if (v.quantity < item.quantity) return res.status(400).json({ error: `Insufficient stock for ${v.product_name}` });

      const price = parseFloat(v.sale_price || v.price);
      orderItems.push({
        product_id: v.product_id,
        variant_id: v.id,
        product_name: v.product_name,
        variant_size: `${v.size_ml}ml`,
        product_image: v.product_image,
        price,
        quantity: item.quantity,
        subtotal: price * item.quantity,
      });
      subtotal += price * item.quantity;
    }

    // Apply coupon
    let discountAmount = 0;
    if (coupon_code) {
      const coupon = await query(
        `SELECT * FROM coupons WHERE code=UPPER($1) AND is_active=true AND (expires_at IS NULL OR expires_at > NOW()) AND (max_uses IS NULL OR used_count < max_uses)`,
        [coupon_code]
      );
      if (coupon.rows.length) {
        const c = coupon.rows[0];
        if (subtotal >= parseFloat(c.minimum_order)) {
          discountAmount = c.type === 'percentage' ? subtotal * (c.value / 100) : parseFloat(c.value);
          discountAmount = Math.min(discountAmount, subtotal);
          await query('UPDATE coupons SET used_count=used_count+1 WHERE id=$1', [c.id]);
        }
      }
    }

    const settingsResult = await query(
      "SELECT key, value FROM settings WHERE key IN ('shipping_rate', 'free_shipping_threshold')"
    );
    const settingsMap = {};
    settingsResult.rows.forEach((row) => { settingsMap[row.key] = row.value; });
    const shippingThreshold = settingsMap.free_shipping_threshold !== undefined
      ? parseFloat(settingsMap.free_shipping_threshold) : 5000;
    const shippingRate = settingsMap.shipping_rate !== undefined
      ? parseFloat(settingsMap.shipping_rate) : 200;
    const shippingAmount = subtotal >= shippingThreshold ? 0 : shippingRate;
    const total = subtotal - discountAmount + shippingAmount;

    const orderResult = await query(
      `INSERT INTO orders (order_number, user_id, status, payment_method, subtotal, discount_amount, shipping_amount, total_amount, coupon_code, shipping_address, notes)
       VALUES ($1,$2,'pending',$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [generateOrderNumber(), req.user?.id || null, payment_method || 'cod',
       subtotal, discountAmount, shippingAmount, total, coupon_code || null,
       JSON.stringify(shipping_address), notes || null]
    );
    const order = orderResult.rows[0];

    // Insert order items and decrement stock
    for (const item of orderItems) {
      await query(
        `INSERT INTO order_items (order_id, product_id, variant_id, product_name, variant_size, product_image, price, quantity, subtotal)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [order.id, item.product_id, item.variant_id, item.product_name, item.variant_size, item.product_image, item.price, item.quantity, item.subtotal]
      );
      await query('UPDATE product_variants SET quantity=quantity-$1 WHERE id=$2', [item.quantity, item.variant_id]);
      await query('UPDATE products SET total_sold=total_sold+$1 WHERE id=$2', [item.quantity, item.product_id]);
    }

    // Notify admin
    await query(
      `INSERT INTO notifications (type, title, message, metadata)
       VALUES ('new_order', 'New Order', $1, $2)`,
      [`Order ${order.order_number} placed`, JSON.stringify({ order_id: order.id })]
    );

    // Send confirmation email if user
    if (req.user) {
      sendOrderConfirmation(order, req.user).catch(console.error);
    }

    res.status(201).json({ order, message: 'Order placed successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create order' });
  }
});

// GET /api/orders — Admin: all orders; User: own orders
router.get('/', authenticate, async (req, res) => {
  try {
    const isAdmin = req.user.role === 'admin';
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    let where = isAdmin ? '' : 'WHERE o.user_id = $1';
    const values = isAdmin ? [limit, offset] : [req.user.id, limit, offset];
    const countValues = isAdmin ? [] : [req.user.id];

    if (isAdmin && req.query.status) {
      where = `WHERE o.status = $1`;
      values.unshift(req.query.status);
      countValues.push(req.query.status);
    }

    const countResult = await query(`SELECT COUNT(*) FROM orders o ${where}`, countValues);
    const result = await query(
      `SELECT o.*, u.first_name, u.last_name, u.email,
        (SELECT json_agg(oi) FROM order_items oi WHERE oi.order_id = o.id) AS items
       FROM orders o
       LEFT JOIN users u ON o.user_id = u.id
       ${where}
       ORDER BY o.created_at DESC
       LIMIT $${values.length - 1} OFFSET $${values.length}`,
      values
    );

    res.json({ orders: result.rows, total: parseInt(countResult.rows[0].count), page, pages: Math.ceil(parseInt(countResult.rows[0].count) / limit) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// GET /api/orders/:id
router.get('/:id', authenticate, async (req, res) => {
  try {
    const result = await query(
      `SELECT o.*, u.first_name, u.last_name, u.email,
        (SELECT json_agg(oi) FROM order_items oi WHERE oi.order_id = o.id) AS items
       FROM orders o
       LEFT JOIN users u ON o.user_id = u.id
       WHERE o.id = $1`,
      [req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Order not found' });

    const order = result.rows[0];
    if (req.user.role !== 'admin' && order.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }
    res.json({ order });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch order' });
  }
});

// PUT /api/orders/:id/status (admin)
router.put('/:id/status', requireAdmin, async (req, res) => {

  try {

    console.log("===== ORDER STATUS UPDATE =====");
    console.log("USER:", req.user);
    console.log("ORDER ID:", req.params.id);
    console.log("BODY:", req.body);


    const { status, tracking_number } = req.body;


    const validStatuses = [
      'pending',
      'confirmed',
      'processing',
      'packed',
      'shipped',
      'delivered',
      'cancelled',
      'refunded'
    ];


    if (!status) {
      return res.status(400).json({
        error: "Status is required"
      });
    }


    if (!validStatuses.includes(status)) {

      return res.status(400).json({
        error: "Invalid status",
        received: status,
        allowed: validStatuses
      });

    }



    const result = await query(
      `
      UPDATE orders

      SET

      status = $1::text,

      tracking_number =
      COALESCE($2::text, tracking_number),


      shipped_at =
      CASE
        WHEN $1::text = 'shipped'
        THEN NOW()
        ELSE shipped_at
      END,


      delivered_at =
      CASE
        WHEN $1::text = 'delivered'
        THEN NOW()
        ELSE delivered_at
      END,


      updated_at = NOW()


      WHERE id = $3::integer


      RETURNING *
      `,
      [
        status,
        tracking_number || null,
        req.params.id
      ]
    );



    if (!result.rows.length) {

      return res.status(404).json({
        error: "Order not found"
      });

    }



    console.log("UPDATED ORDER:", result.rows[0]);



    res.status(200).json({

      success: true,

      message: "Order status updated successfully",

      order: result.rows[0]

    });



  } catch (error) {


    console.error(
      "ORDER STATUS UPDATE ERROR:",
      error
    );


    res.status(500).json({

      success:false,

      error:error.message,

      detail:error.detail || null,

      code:error.code || null

    });


  }

});

// DELETE /api/orders/:id (admin)
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const result = await query('DELETE FROM orders WHERE id=$1 RETURNING id', [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ error: 'Order not found' });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete order' });
  }
});

// Cart endpoints (guest cart sync)
router.get('/cart', optionalAuth, (req, res) => res.json({ items: [] }));
router.post('/cart', optionalAuth, (req, res) => res.json({ success: true }));
router.put('/cart/:id', optionalAuth, (req, res) => res.json({ success: true }));
router.delete('/cart/:id', optionalAuth, (req, res) => res.json({ success: true }));

module.exports = router;
