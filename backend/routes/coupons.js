const express = require('express');
const { query } = require('../config/database');
const { requireAdmin, optionalAuth } = require('../middleware/auth');

const router = express.Router();

function normalizeCoupon(row) {
  return row;
}

function validateDiscount(type, value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return 'Discount value must be greater than 0';
  if (type === 'percentage' && n > 100) return 'Percentage discount cannot exceed 100';
  return null;
}

// Public: active coupons can be surfaced in storefront banners/widgets.
router.get('/active', async (req, res) => {
  try {
    const result = await query(
      `SELECT id, code, type, value, minimum_order, max_discount, max_uses, used_count,
              description, starts_at, expires_at
       FROM coupons
       WHERE is_active=true
         AND (starts_at IS NULL OR starts_at <= NOW())
         AND (expires_at IS NULL OR expires_at > NOW())
         AND (max_uses IS NULL OR used_count < max_uses)
       ORDER BY created_at DESC`
    );
    res.json({ coupons: result.rows.map(normalizeCoupon) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch active coupons' });
  }
});

router.get('/', requireAdmin, async (req, res) => {
  try {
    const result = await query('SELECT * FROM coupons ORDER BY created_at DESC');
    res.json({ coupons: result.rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch coupons' });
  }
});

router.post('/', requireAdmin, async (req, res) => {
  try {
    const {
      code, discount_type, discount_value, min_purchase, max_discount,
      usage_limit, starts_at, expires_at, description
    } = req.body;
    const normalizedCode = String(code || '').trim().toUpperCase();
    if (!normalizedCode) return res.status(400).json({ error: 'Coupon code is required' });
    const type = discount_type || 'percentage';
    if (!['percentage', 'fixed'].includes(type)) return res.status(400).json({ error: 'Invalid discount type' });
    const discountError = validateDiscount(type, discount_value);
    if (discountError) return res.status(400).json({ error: discountError });
    if (starts_at && expires_at && new Date(starts_at) >= new Date(expires_at)) {
      return res.status(400).json({ error: 'Expiry must be after the start date' });
    }

    const result = await query(
      `INSERT INTO coupons
        (code, type, value, minimum_order, max_discount, max_uses, description, starts_at, expires_at)
       VALUES (UPPER($1), $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [normalizedCode, type, Number(discount_value), Number(min_purchase || 0),
       max_discount === '' || max_discount == null ? null : Number(max_discount),
       usage_limit === '' || usage_limit == null || Number(usage_limit) <= 0 ? null : Number(usage_limit),
       description || null, starts_at || null, expires_at || null]
    );
    res.status(201).json({ coupon: result.rows[0] });
  } catch (error) {
    console.error(error);
    if (error.code === '23505') return res.status(400).json({ error: 'Coupon code already exists' });
    res.status(500).json({ error: 'Failed to create coupon' });
  }
});

router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const { code, type, value, minimum_order, max_discount, max_uses, description, starts_at, expires_at, is_active } = req.body;
    const normalizedCode = String(code || '').trim().toUpperCase();
    const discountError = validateDiscount(type || 'percentage', value);
    if (!normalizedCode) return res.status(400).json({ error: 'Coupon code is required' });
    if (discountError) return res.status(400).json({ error: discountError });
    if (starts_at && expires_at && new Date(starts_at) >= new Date(expires_at)) {
      return res.status(400).json({ error: 'Expiry must be after the start date' });
    }
    const result = await query(
      `UPDATE coupons
       SET code=UPPER($1), type=$2, value=$3, minimum_order=$4, max_discount=$5,
           max_uses=$6, description=$7, starts_at=$8, expires_at=$9,
           is_active=$10
       WHERE id=$11 RETURNING *`,
      [normalizedCode, type || 'percentage', Number(value), Number(minimum_order || 0),
       max_discount === '' || max_discount == null ? null : Number(max_discount),
       max_uses === '' || max_uses == null || Number(max_uses) <= 0 ? null : Number(max_uses),
       description || null, starts_at || null, expires_at || null, is_active !== false, req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Coupon not found' });
    res.json({ coupon: result.rows[0] });
  } catch (error) {
    console.error(error);
    if (error.code === '23505') return res.status(400).json({ error: 'Coupon code already exists' });
    res.status(500).json({ error: 'Failed to update coupon' });
  }
});

router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const result = await query('DELETE FROM coupons WHERE id=$1 RETURNING id', [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ error: 'Coupon not found' });
    res.json({ message: 'Coupon deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete coupon' });
  }
});

router.post('/validate', optionalAuth, async (req, res) => {
  try {
    const code = String(req.body?.code || '').trim().toUpperCase();
    if (!code) return res.status(400).json({ error: 'Coupon code is required' });
    const result = await query(
      `SELECT * FROM coupons
       WHERE code=$1 AND is_active=true
         AND (starts_at IS NULL OR starts_at <= NOW())
         AND (expires_at IS NULL OR expires_at > NOW())
         AND (max_uses IS NULL OR used_count < max_uses)`,
      [code]
    );
    if (!result.rows.length) return res.status(400).json({ error: 'Invalid, inactive, or expired coupon' });
    res.json({ coupon: result.rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to validate coupon' });
  }
});

module.exports = router;
