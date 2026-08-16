const express = require('express');
const { query, getClient } = require('../config/database');
const crypto = require('crypto');
const { authenticate, requireAdmin, optionalAuth } = require('../middleware/auth');
const { sendOrderReceivedEmail, sendOrderConfirmation, sendOrderStatusUpdateEmail } = require('../services/email');

const router = express.Router();

async function ensureShipmentSchema() {
  try {
    await query('ALTER TABLE orders ADD COLUMN IF NOT EXISTS tracking_carrier VARCHAR(100)');
    await query('ALTER TABLE orders ADD COLUMN IF NOT EXISTS tracking_url TEXT');
    await query(`CREATE TABLE IF NOT EXISTS order_status_history (
      id SERIAL PRIMARY KEY, order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      status VARCHAR(30) NOT NULL, note TEXT, tracking_number VARCHAR(100), tracking_carrier VARCHAR(100),
      tracking_url TEXT, changed_by INTEGER REFERENCES users(id) ON DELETE SET NULL, created_at TIMESTAMP DEFAULT NOW()
    )`);
  } catch (e) { console.error('shipment schema migration:', e.message); }
}
ensureShipmentSchema();

function buildTrackingUrl(carrier, trackingNumber) {
  const n = encodeURIComponent(String(trackingNumber || '').trim());
  if (!n) return '';
  const maps = {
    tcs: `https://www.tcsexpress.com/track/${n}`,
    leopards: `https://leopardscourier.com/track/track-your-parcel/?cn=${n}`,
    mnp: `https://www.mulphilog.com/tracking?tracking_number=${n}`,
    trax: `https://trax.pk/tracking?tracking_number=${n}`,
    postex: `https://postex.pk/tracking?tracking_number=${n}`,
    blueex: `https://www.blue-ex.com/tracking?track=${n}`,
    dhl: `https://www.dhl.com/global-en/home/tracking.html?tracking-id=${n}`,
    fedex: `https://www.fedex.com/fedextrack/?trknbr=${n}`,
    ups: `https://www.ups.com/track?loc=en_US&tracknum=${n}`,
  };
  return maps[String(carrier || '').toLowerCase()] || '';
}

// One-time migration: PaymentShipping.jsx (zones) and Settings.jsx used to write
// different key names for the same concept (shipping_rate/free_shipping_threshold
// vs shipping_flat_rate/shipping_free_threshold), so only one of the two admin
// pages ever actually affected checkout pricing. This copies any legacy values
// forward once so existing stores don't lose a rate they already configured.
async function migrateLegacyShippingKeys() {
  try {
    const result = await query(
      "SELECT key, value FROM settings WHERE key IN ('shipping_rate','free_shipping_threshold','shipping_flat_rate','shipping_free_threshold')"
    );
    const map = {};
    result.rows.forEach((row) => { map[row.key] = row.value; });
    const copies = [];
    if (map.shipping_flat_rate === undefined && map.shipping_rate !== undefined) {
      copies.push(['shipping_flat_rate', map.shipping_rate]);
    }
    if (map.shipping_free_threshold === undefined && map.free_shipping_threshold !== undefined) {
      copies.push(['shipping_free_threshold', map.free_shipping_threshold]);
    }
    for (const [key, value] of copies) {
      await query(
        'INSERT INTO settings (key, value) VALUES ($1,$2) ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value, updated_at=NOW()',
        [key, value]
      );
    }
  } catch (e) {
    console.error('shipping key migration:', e.message);
  }
}
migrateLegacyShippingKeys();

// Resolve the shipping rate that applies to an order: a matching zone (by city)
// takes precedence, then the flat/global defaults from Payment & Shipping settings.
function resolveShipping(settingsMap, subtotal, shipping_address) {
  const globalRate = settingsMap.shipping_flat_rate !== undefined
    ? parseFloat(settingsMap.shipping_flat_rate)
    : settingsMap.shipping_rate !== undefined ? parseFloat(settingsMap.shipping_rate) : 200;
  const globalThreshold = settingsMap.shipping_free_threshold !== undefined
    ? parseFloat(settingsMap.shipping_free_threshold)
    : settingsMap.free_shipping_threshold !== undefined ? parseFloat(settingsMap.free_shipping_threshold) : 5000;

  let zones = [];
  try { zones = JSON.parse(settingsMap.shipping_zones || '[]'); } catch { zones = []; }

  const city = (shipping_address?.city || '').trim().toLowerCase();
  const zone = city
    ? zones.find((z) => (z.regions || '').split(',').map((r) => r.trim().toLowerCase()).includes(city))
    : null;

  const rate = zone?.flat_rate !== undefined && zone?.flat_rate !== '' ? parseFloat(zone.flat_rate) : globalRate;
  const threshold = zone?.free_threshold !== undefined && zone?.free_threshold !== '' ? parseFloat(zone.free_threshold) : globalThreshold;

  return subtotal >= threshold ? 0 : rate;
}

// Generates a unique, human-readable order number, e.g. NM-M1A2B3-X9Q7.
// Timestamp (base36) + random suffix keeps collisions effectively impossible
// without needing a DB round-trip to check uniqueness.
function generateOrderNumber() {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `NM-${timestamp}-${random}`;
}

// POST /api/orders — Create order
router.post('/', optionalAuth, async (req, res) => {
  const client = await getClient();
  try {
    const { items, shipping_address, payment_method, coupon_code, notes } = req.body;
    if (!items || items.length === 0) return res.status(400).json({ error: 'No items in order' });

    await client.query('BEGIN');

    // Get fresh prices and validate stock
    let subtotal = 0;
    const orderItems = [];
    for (const item of items) {
      const varResult = await client.query(
        `SELECT pv.*, p.name as product_name,
          (SELECT url FROM product_images WHERE product_id=p.id AND is_primary=true LIMIT 1) as product_image
         FROM product_variants pv JOIN products p ON pv.product_id = p.id
         WHERE pv.id = $1 AND pv.is_active = true`,
        [item.variant_id]
      );
      if (!varResult.rows.length) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: `Invalid variant ${item.variant_id}` });
      }
      const v = varResult.rows[0];
      if (v.quantity < item.quantity) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: `Insufficient stock for ${v.product_name}` });
      }

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

    // Apply coupon from the server-side database so the customer can never alter
    // the discount amount in the browser. Invalid/expired coupons are rejected
    // rather than silently turning into a full-price order.
    let discountAmount = 0;
    if (coupon_code) {
      const coupon = await client.query(
        `SELECT * FROM coupons
         WHERE code=UPPER($1) AND is_active=true
           AND (starts_at IS NULL OR starts_at <= NOW())
           AND (expires_at IS NULL OR expires_at > NOW())
           AND (max_uses IS NULL OR used_count < max_uses)
         FOR UPDATE`,
        [coupon_code]
      );
      if (!coupon.rows.length) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Invalid, inactive, or expired coupon' });
      }
      const c = coupon.rows[0];
      if (subtotal < parseFloat(c.minimum_order || 0)) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: `Minimum order of ${c.minimum_order} is required for this coupon` });
      }
      discountAmount = c.type === 'percentage' ? subtotal * (Number(c.value) / 100) : Number(c.value);
      if (c.max_discount != null) discountAmount = Math.min(discountAmount, Number(c.max_discount));
      discountAmount = Math.min(discountAmount, subtotal);
      await client.query('UPDATE coupons SET used_count=used_count+1 WHERE id=$1', [c.id]);
    }

    const settingsResult = await client.query(
      "SELECT key, value FROM settings WHERE key IN ('shipping_flat_rate', 'shipping_free_threshold', 'shipping_rate', 'free_shipping_threshold', 'shipping_zones')"
    );
    const settingsMap = {};
    settingsResult.rows.forEach((row) => { settingsMap[row.key] = row.value; });
    const shippingAmount = resolveShipping(settingsMap, subtotal, shipping_address);
    const total = subtotal - discountAmount + shippingAmount;

    const rawConfirmationToken = crypto.randomBytes(32).toString('hex');
    const confirmationTokenHash = crypto.createHash('sha256').update(rawConfirmationToken).digest('hex');
    const confirmationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const orderResult = await client.query(
      `INSERT INTO orders (order_number, user_id, status, payment_method, subtotal, discount_amount, shipping_amount, total_amount, coupon_code, shipping_address, notes, confirmation_token_hash, confirmation_token_expires)
       VALUES ($1,$2,'pending',$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
      [generateOrderNumber(), req.user?.id || null, payment_method || 'cod',
       subtotal, discountAmount, shippingAmount, total, coupon_code || null,
       JSON.stringify(shipping_address), notes || null, confirmationTokenHash, confirmationTokenExpires]
    );
    const order = orderResult.rows[0];

    // Insert order items and decrement stock
    for (const item of orderItems) {
      await client.query(
        `INSERT INTO order_items (order_id, product_id, variant_id, product_name, variant_size, product_image, price, quantity, subtotal)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [order.id, item.product_id, item.variant_id, item.product_name, item.variant_size, item.product_image, item.price, item.quantity, item.subtotal]
      );
      await client.query('UPDATE product_variants SET quantity=quantity-$1 WHERE id=$2', [item.quantity, item.variant_id]);
      await client.query('UPDATE products SET total_sold=total_sold+$1 WHERE id=$2', [item.quantity, item.product_id]);
    }

    // Record the initial order status so the customer tracking timeline is complete.
    await client.query(
      `INSERT INTO order_status_history (order_id,status,note,tracking_number,tracking_carrier,tracking_url) VALUES ($1,'pending',$2,NULL,NULL,NULL)`,
      [order.id, 'Order placed']
    ).catch((e) => console.error('initial order history:', e.message));

    // Notify admin
    await client.query(
      `INSERT INTO notifications (type, title, message, metadata)
       VALUES ('new_order', 'New Order', $1, $2)`,
      [`Order ${order.order_number} placed`, JSON.stringify({ order_id: order.id })]
    );

    await client.query('COMMIT');

    // Send confirmation email — recipient comes from shipping_address inside
    // sendOrderConfirmation, so this now reaches guest checkouts too (it used
    // to only fire `if (req.user)`, silently skipping every guest order).
    sendOrderReceivedEmail(order, rawConfirmationToken, orderItems).catch(console.error);

    res.status(201).json({ order, message: 'Order placed successfully' });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    console.error(error);
    res.status(500).json({ error: 'Failed to create order' });
  } finally {
    client.release();
  }
});

// POST /api/orders/confirm — public, one-time customer confirmation link
router.post('/confirm', async (req, res) => {
  const { token } = req.body || {};
  if (!token) return res.status(400).json({ error: 'Confirmation link is missing.' });

  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const result = await client.query(
      `SELECT o.*, u.first_name, u.last_name, u.email
       FROM orders o LEFT JOIN users u ON o.user_id=u.id
       WHERE o.confirmation_token_hash=$1
       FOR UPDATE OF o`,
      [tokenHash]
    );

    if (!result.rows.length) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'This order confirmation link is invalid.' });
    }

    const order = result.rows[0];
    // Idempotent confirmation: after success, the same email link remains
    // safe to open and reports the successful confirmed state.
    if (order.status === 'confirmed') {
      await client.query('ROLLBACK');
      return res.json({ order, alreadyConfirmed: true, message: 'Your order is already confirmed.' });
    }
    if (order.status === 'cancelled' || order.status === 'refunded') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'This order can no longer be confirmed.' });
    }
    if (order.status !== 'pending') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'This order can no longer be confirmed.' });
    }
    if (!order.confirmation_token_expires || new Date(order.confirmation_token_expires) <= new Date()) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'This order confirmation link has expired. Please request a new confirmation email.' });
    }

    const updated = await client.query(
      `UPDATE orders
       SET status='confirmed', updated_at=NOW()
       WHERE id=$1
       RETURNING *`,
      [order.id]
    );
    const confirmedOrder = updated.rows[0];
    await client.query(
      `INSERT INTO order_status_history (order_id,status,note,tracking_number,tracking_carrier,tracking_url) VALUES ($1,'confirmed',$2,$3,$4,$5)`,
      [order.id, 'Customer confirmed the order', confirmedOrder.tracking_number || null, confirmedOrder.tracking_carrier || null, confirmedOrder.tracking_url || null]
    ).catch((e) => console.error('confirmation history:', e.message));
    await client.query('COMMIT');

    sendOrderConfirmation(confirmedOrder).catch(console.error);
    res.json({ order: confirmedOrder, message: 'Order confirmed successfully.' });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    console.error(error);
    res.status(500).json({ error: 'Failed to confirm order.' });
  } finally {
    client.release();
  }
});

// GET /api/orders — Admin: all orders; User: own orders
router.get('/', authenticate, async (req, res) => {
  try {
    const isAdmin = req.user.role === 'admin';
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;
    const clauses = [];
    const params = [];

    if (!isAdmin) { params.push(req.user.id); clauses.push(`o.user_id = $${params.length}`); }
    if (isAdmin && req.query.status) { params.push(req.query.status); clauses.push(`o.status = $${params.length}`); }
    if (isAdmin && req.query.search) {
      const q = `%${String(req.query.search).trim()}%`;
      params.push(q);
      clauses.push(`(o.order_number ILIKE $${params.length} OR COALESCE(u.first_name,'') ILIKE $${params.length} OR COALESCE(u.last_name,'') ILIKE $${params.length} OR COALESCE(u.email,'') ILIKE $${params.length} OR COALESCE(o.shipping_address->>'phone','') ILIKE $${params.length} OR COALESCE(o.tracking_number,'') ILIKE $${params.length})`);
    }
    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    const countResult = await query(`SELECT COUNT(*) FROM orders o LEFT JOIN users u ON u.id=o.user_id ${where}`, params);
    const listParams = [...params, limit, offset];
    const result = await query(`SELECT o.*, u.first_name, u.last_name, u.email, COALESCE(NULLIF(TRIM(CONCAT_WS(' ',u.first_name,u.last_name)),''), NULLIF(TRIM(CONCAT_WS(' ',o.shipping_address->>'firstName',o.shipping_address->>'lastName')),''), 'Guest Customer') AS customer_name, (SELECT json_agg(oi ORDER BY oi.id) FROM order_items oi WHERE oi.order_id=o.id) AS items FROM orders o LEFT JOIN users u ON o.user_id=u.id ${where} ORDER BY o.created_at DESC LIMIT $${listParams.length-1} OFFSET $${listParams.length}`, listParams);
    const total = parseInt(countResult.rows[0].count);
    res.json({ orders: result.rows, total, page, pages: Math.ceil(total / limit) });
  } catch (error) { console.error(error); res.status(500).json({ error: 'Failed to fetch orders' }); }
});

// GET /api/orders/track/:trackingNumber — public customer tracking lookup.
// Accepts either the carrier tracking number OR the site's own order number
// (e.g. "NM-XXXXX"), since a customer may be looking this up before the
// order has shipped and only has their order number to go on.
router.get('/track/:trackingNumber', async (req, res) => {
  try {
    const value = String(req.params.trackingNumber || '').trim().replace(/^#/, '');
    if (!value || value.length > 120) return res.status(400).json({ error: 'A valid tracking number or order number is required.' });
    const result = await query(
      `SELECT id, order_number, status, tracking_number, tracking_carrier, tracking_url, created_at, shipped_at, delivered_at
       FROM orders
       WHERE LOWER(TRIM(tracking_number)) = LOWER(TRIM($1)) OR LOWER(TRIM(order_number)) = LOWER(TRIM($1))
       LIMIT 1`,
      [value]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'We could not find an order with that tracking number or order number.' });
    const order = result.rows[0];
    const history = await query(
      `SELECT status, note, tracking_number, tracking_carrier, tracking_url, created_at
       FROM order_status_history WHERE order_id=$1 ORDER BY created_at ASC`,
      [order.id]
    ).catch(() => ({ rows: [] }));
    res.json({
      tracking: { order_number: order.order_number, status: order.status, tracking_number: order.tracking_number, carrier: order.tracking_carrier, tracking_url: order.tracking_url, created_at: order.created_at, shipped_at: order.shipped_at, delivered_at: order.delivered_at },
      history: history.rows,
    });
  } catch (error) {
    console.error('Public tracking lookup:', error);
    res.status(500).json({ error: 'Failed to look up tracking information.' });
  }
});

// GET /api/orders/:id/history
router.get('/:id/history', authenticate, async (req,res)=>{
  try {
    const o=await query('SELECT user_id FROM orders WHERE id=$1',[req.params.id]);
    if(!o.rows.length)return res.status(404).json({error:'Order not found'});
    if(req.user.role!=='admin'&&o.rows[0].user_id!==req.user.id)return res.status(403).json({error:'Access denied'});
    const h=await query('SELECT * FROM order_status_history WHERE order_id=$1 ORDER BY created_at ASC',[req.params.id]);
    res.json({history:h.rows});
  }catch(e){res.status(500).json({error:'Failed to fetch order history'});}
});

// GET /api/orders/shipments/summary (admin)
router.get('/shipments/summary', requireAdmin, async (req,res)=>{
  try {
    const r=await query(`SELECT status, COUNT(*)::int count FROM orders WHERE status IN ('confirmed','processing','packed','shipped','delivered') GROUP BY status`);
    res.json({summary:r.rows});
  } catch(e){res.status(500).json({error:'Failed to fetch shipment summary'});}
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


    const { status, tracking_number, tracking_carrier, tracking_url, note } = req.body;


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



    const previousResult = await query('SELECT * FROM orders WHERE id=$1', [req.params.id]);
    if (!previousResult.rows.length) return res.status(404).json({ error: 'Order not found' });
    const previousOrder = previousResult.rows[0];
    const finalTrackingUrl = tracking_url || buildTrackingUrl(tracking_carrier || previousOrder.tracking_carrier, tracking_number || previousOrder.tracking_number);

    const result = await query(
      `
      UPDATE orders

      SET

      status = $1::text,

      tracking_number = COALESCE($2::text, tracking_number),
      tracking_carrier = COALESCE($4::text, tracking_carrier),
      tracking_url = COALESCE($5::text, tracking_url),


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

      cancelled_at =
      CASE
        WHEN $1::text = 'cancelled'
        THEN NOW()
        ELSE cancelled_at
      END,


      updated_at = NOW()


      WHERE id = $3::integer


      RETURNING *
      `,
      [
        status,
        tracking_number || null,
        req.params.id,
        tracking_carrier || null,
        finalTrackingUrl || null
      ]
    );



    if (!result.rows.length) {

      return res.status(404).json({
        error: "Order not found"
      });

    }



    console.log("UPDATED ORDER:", result.rows[0]);

    const updatedOrder = result.rows[0];
    await query(`INSERT INTO order_status_history (order_id,status,note,tracking_number,tracking_carrier,tracking_url,changed_by) VALUES ($1,$2,$3,$4,$5,$6,$7)`, [updatedOrder.id,status,note||null,updatedOrder.tracking_number||null,updatedOrder.tracking_carrier||null,updatedOrder.tracking_url||null,req.user.id]).catch(e=>console.error('status history:',e.message));
    if (previousOrder.status !== status) sendOrderStatusUpdateEmail(updatedOrder, previousOrder.status).catch(console.error);



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
