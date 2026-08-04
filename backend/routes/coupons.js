const express = require('express');
const { query } = require('../config/database');
const { requireAdmin, optionalAuth } = require('../middleware/auth');

const router = express.Router();

router.get('/', requireAdmin, async (req, res) => {
  try {
    const result = await query('SELECT * FROM coupons ORDER BY created_at DESC');
    res.json({ coupons: result.rows });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch coupons' });
  }
});

router.post('/', requireAdmin, async (req, res) => {
  try {
    const { code, type, value, minimum_order, max_uses, expires_at } = req.body;
    const result = await query(
      `INSERT INTO coupons (code, type, value, minimum_order, max_uses, expires_at)
       VALUES (UPPER($1),$2,$3,$4,$5,$6) RETURNING *`,
      [code, type || 'percentage', value, minimum_order || 0, max_uses || null, expires_at || null]
    );
    res.status(201).json({ coupon: result.rows[0] });
  } catch (error) {
    if (error.code === '23505') return res.status(400).json({ error: 'Coupon code already exists' });
    res.status(500).json({ error: 'Failed to create coupon' });
  }
});

router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const { code, type, value, minimum_order, max_uses, expires_at, is_active } = req.body;
    const result = await query(
      `UPDATE coupons SET code=UPPER($1), type=$2, value=$3, minimum_order=$4, max_uses=$5, expires_at=$6, is_active=$7
       WHERE id=$8 RETURNING *`,
      [code, type, value, minimum_order || 0, max_uses || null, expires_at || null, is_active !== false, req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Coupon not found' });
    res.json({ coupon: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update coupon' });
  }
});

router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    await query('DELETE FROM coupons WHERE id=$1', [req.params.id]);
    res.json({ message: 'Coupon deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete coupon' });
  }
});

router.post('/validate', optionalAuth, async (req, res) => {
  try {
    const { code } = req.body;
    const result = await query(
      `SELECT * FROM coupons WHERE code=UPPER($1) AND is_active=true
       AND (expires_at IS NULL OR expires_at > NOW())
       AND (max_uses IS NULL OR used_count < max_uses)`,
      [code]
    );
    if (!result.rows.length) return res.status(400).json({ error: 'Invalid or expired coupon' });
    res.json({ coupon: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: 'Failed to validate coupon' });
  }
});

module.exports = router;
