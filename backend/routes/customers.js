const express = require('express');
const { query } = require('../config/database');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// GET /api/users — Admin: all users
router.get('/', requireAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const countResult = await query("SELECT COUNT(*) FROM users WHERE role='customer'");
    const result = await query(
      `SELECT u.id, u.email, u.first_name, u.last_name, u.phone, u.is_active, u.created_at,
        COUNT(DISTINCT o.id) as order_count,
        COALESCE(SUM(o.total_amount) FILTER (WHERE o.status NOT IN ('cancelled','refunded')),0) as total_spent
       FROM users u
       LEFT JOIN orders o ON u.id = o.user_id
       WHERE u.role = 'customer'
       GROUP BY u.id
       ORDER BY u.created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    res.json({
      customers: result.rows,
      total: parseInt(countResult.rows[0].count),
      page,
      pages: Math.ceil(parseInt(countResult.rows[0].count) / limit),
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch customers' });
  }
});

// GET /api/users/wishlist — Current user's wishlist
router.get('/wishlist', authenticate, async (req, res) => {
  try {
    const result = await query(
      `SELECT w.id, w.created_at, p.id as product_id, p.name, p.slug,
        (SELECT url FROM product_images WHERE product_id=p.id AND is_primary=true LIMIT 1) as image,
        (SELECT json_agg(pv ORDER BY pv.size_ml) FROM product_variants pv WHERE pv.product_id=p.id AND pv.is_active=true) as variants
       FROM wishlist w
       JOIN products p ON w.product_id = p.id
       WHERE w.user_id = $1 AND p.is_visible = true
       ORDER BY w.created_at DESC`,
      [req.user.id]
    );
    res.json({ wishlist: result.rows });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch wishlist' });
  }
});

// POST /api/users/wishlist
router.post('/wishlist', authenticate, async (req, res) => {
  try {
    const { productId } = req.body;
    await query(
      'INSERT INTO wishlist (user_id, product_id) VALUES ($1,$2) ON CONFLICT DO NOTHING',
      [req.user.id, productId]
    );
    res.json({ message: 'Added to wishlist' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to add to wishlist' });
  }
});

// DELETE /api/users/wishlist/:productId
router.delete('/wishlist/:productId', authenticate, async (req, res) => {
  try {
    await query('DELETE FROM wishlist WHERE user_id=$1 AND product_id=$2', [req.user.id, req.params.productId]);
    res.json({ message: 'Removed from wishlist' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to remove from wishlist' });
  }
});

// GET /api/users/:id — Admin: single customer
router.get('/:id', requireAdmin, async (req, res) => {
  try {
    const result = await query(
      `SELECT u.id, u.email, u.first_name, u.last_name, u.phone, u.is_active, u.created_at
       FROM users u WHERE u.id=$1`,
      [req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Customer not found' });

    const orders = await query(
      'SELECT * FROM orders WHERE user_id=$1 ORDER BY created_at DESC LIMIT 10',
      [req.params.id]
    );

    res.json({ customer: result.rows[0], orders: orders.rows });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch customer' });
  }
});

// PUT /api/users/:id (admin)
router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const { is_active } = req.body;
    const result = await query(
      'UPDATE users SET is_active=$1, updated_at=NOW() WHERE id=$2 RETURNING id,email,first_name,last_name,is_active',
      [is_active, req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Customer not found' });
    res.json({ customer: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update customer' });
  }
});

// DELETE /api/users/:id (admin)
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    await query("DELETE FROM users WHERE id=$1 AND role='customer'", [req.params.id]);
    res.json({ message: 'Customer deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete customer' });
  }
});

module.exports = router;
