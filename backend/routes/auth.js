const express = require('express');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const { query } = require('../config/database');
const { authenticate, generateToken } = require('../middleware/auth');

const router = express.Router();

// POST /api/auth/register
router.post('/register', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('first_name').notEmpty().trim(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });

  try {
    const { email, password, first_name, last_name, phone } = req.body;
    const existing = await query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length) return res.status(400).json({ error: 'Email already registered' });

    const hash = await bcrypt.hash(password, 12);
    const result = await query(
      'INSERT INTO users (email, password_hash, first_name, last_name, phone) VALUES ($1,$2,$3,$4,$5) RETURNING id, email, first_name, last_name, role',
      [email, hash, first_name, last_name || '', phone || '']
    );
    const user = result.rows[0];
    const token = generateToken(user.id);
    res.status(201).json({ token, user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// POST /api/auth/login
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: 'Invalid email or password' });

  try {
    const { email, password } = req.body;
    const result = await query('SELECT * FROM users WHERE email = $1 AND is_active = true', [email]);
    if (!result.rows.length) return res.status(401).json({ error: 'Invalid email or password' });

    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid email or password' });

    const token = generateToken(user.id);
    const { password_hash, ...safeUser } = user;
    res.json({ token, user: safeUser });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// GET /api/auth/profile
router.get('/profile', authenticate, async (req, res) => {
  try {
    const result = await query(
      'SELECT id, email, first_name, last_name, phone, role, created_at FROM users WHERE id = $1',
      [req.user.id]
    );
    res.json({ user: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get profile' });
  }
});

// PUT /api/auth/profile
router.put('/profile', authenticate, async (req, res) => {
  try {
    const { first_name, last_name, phone } = req.body;
    const result = await query(
      'UPDATE users SET first_name=$1, last_name=$2, phone=$3, updated_at=NOW() WHERE id=$4 RETURNING id,email,first_name,last_name,phone,role',
      [first_name, last_name, phone, req.user.id]
    );
    res.json({ user: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// PUT /api/auth/change-email  (admin only — changes login email)
router.put('/change-email', authenticate, async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Valid email is required' });
    }
    // Check not already taken by another user
    const existing = await query('SELECT id FROM users WHERE email = $1 AND id != $2', [email, req.user.id]);
    if (existing.rows.length) return res.status(400).json({ error: 'Email already in use' });

    const result = await query(
      'UPDATE users SET email=$1, updated_at=NOW() WHERE id=$2 RETURNING id,email,first_name,last_name,role',
      [email, req.user.id]
    );
    res.json({ user: result.rows[0], message: 'Email updated successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update email' });
  }
});

// PUT /api/auth/change-password
router.put('/change-password', authenticate, async (req, res) => {
  try {
    const { current_password, new_password } = req.body;
    const result = await query('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
    const valid = await bcrypt.compare(current_password, result.rows[0].password_hash);
    if (!valid) return res.status(400).json({ error: 'Current password is incorrect' });

    const hash = await bcrypt.hash(new_password, 12);
    await query('UPDATE users SET password_hash=$1 WHERE id=$2', [hash, req.user.id]);
    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to change password' });
  }
});

module.exports = router;
