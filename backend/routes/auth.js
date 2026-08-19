const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { body, validationResult } = require('express-validator');
const { query } = require('../config/database');
const { authenticate, generateToken } = require('../middleware/auth');
const { sendWelcomeEmail, sendEmailVerificationEmail, sendPasswordResetEmail, getEmailSettings, getPublicSiteUrl } = require('../services/email');

const router = express.Router();

// POST /api/auth/register — create the account, then verify the email before login
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
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expires = new Date(Date.now() + 15 * 60 * 1000);
    const otp = crypto.randomInt(100000, 1000000).toString();
    const otpHash = await bcrypt.hash(otp, 10);

    const result = await query(
      `INSERT INTO users
       (email, password_hash, first_name, last_name, phone, email_verified,
        email_verification_token_hash, email_verification_expires,
        email_verification_otp_hash, email_verification_otp_expires, email_verification_otp_attempts)
       VALUES ($1,$2,$3,$4,$5,false,$6,$7,$8,$7,0)
       RETURNING id, email, first_name, last_name, phone, role, email_verified`,
      [email, hash, first_name, last_name || '', phone || '', tokenHash, expires, otpHash]
    );
    const user = result.rows[0];

    const baseUrl = getPublicSiteUrl(await getEmailSettings());
    const verificationLink = `${baseUrl.replace(/\/$/, '')}/verify-email?token=${encodeURIComponent(rawToken)}`;
    sendEmailVerificationEmail(user, verificationLink, otp).catch((e) => console.error('verification email failed:', e.message));

    res.status(201).json({
      requiresVerification: true,
      email: user.email,
      message: 'Account created. Check your email to verify your account before signing in.',
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// POST /api/auth/verify-email — consumes a one-time verification link
router.post('/verify-email', [body('token').notEmpty()], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: 'Invalid verification link' });
  try {
    const tokenHash = crypto.createHash('sha256').update(req.body.token).digest('hex');
    const result = await query(
      `SELECT id, email, first_name, last_name, phone, role, email_verified
       FROM users
       WHERE email_verification_token_hash=$1 AND email_verification_expires > NOW() AND is_active=true`,
      [tokenHash]
    );
    if (!result.rows.length) return res.status(400).json({ error: 'This verification link is invalid or has expired.' });
    const user = result.rows[0];
    await query(
      `UPDATE users SET email_verified=true,
        email_verification_token_hash=NULL, email_verification_expires=NULL,
        email_verification_otp_hash=NULL, email_verification_otp_expires=NULL,
        email_verification_otp_attempts=0, updated_at=NOW()
       WHERE id=$1`, [user.id]
    );
    const token = generateToken(user.id);
    sendWelcomeEmail({ ...user, email_verified: true }).catch((e) => console.error('welcome email failed:', e.message));
    res.json({ token, user: { ...user, email_verified: true }, message: 'Email verified successfully.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to verify email' });
  }
});

// POST /api/auth/verify-email-otp — alternative to clicking the verification link
router.post('/verify-email-otp', [
  body('email').isEmail().normalizeEmail(),
  body('otp').isLength({ min: 6, max: 6 }),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: 'A valid email and 6-digit code are required' });
  try {
    const { email, otp } = req.body;
    const result = await query(
      `SELECT id, email, first_name, last_name, phone, role, email_verified,
              email_verification_otp_hash, email_verification_otp_expires, email_verification_otp_attempts
       FROM users WHERE email=$1 AND is_active=true`, [email]
    );
    const user = result.rows[0];
    if (!user || user.email_verified) return res.status(400).json({ error: 'This verification code is invalid or has expired.' });
    if (!user.email_verification_otp_hash || !user.email_verification_otp_expires || new Date(user.email_verification_otp_expires) < new Date() || user.email_verification_otp_attempts >= 5) {
      return res.status(400).json({ error: 'This verification code is invalid or has expired.' });
    }
    const valid = await bcrypt.compare(otp, user.email_verification_otp_hash);
    if (!valid) {
      await query('UPDATE users SET email_verification_otp_attempts=email_verification_otp_attempts+1 WHERE id=$1', [user.id]);
      return res.status(400).json({ error: 'This verification code is invalid or has expired.' });
    }
    await query(
      `UPDATE users SET email_verified=true,
        email_verification_token_hash=NULL, email_verification_expires=NULL,
        email_verification_otp_hash=NULL, email_verification_otp_expires=NULL,
        email_verification_otp_attempts=0, updated_at=NOW() WHERE id=$1`, [user.id]
    );
    const token = generateToken(user.id);
    sendWelcomeEmail({ ...user, email_verified: true }).catch((e) => console.error('welcome email failed:', e.message));
    const { email_verification_otp_hash, email_verification_otp_expires, email_verification_otp_attempts, ...safeUser } = user;
    res.json({ token, user: { ...safeUser, email_verified: true }, message: 'Email verified successfully.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to verify email code' });
  }
});

// POST /api/auth/resend-verification
router.post('/resend-verification', [body('email').isEmail().normalizeEmail()], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: 'A valid email is required' });
  const generic = { message: 'If that account needs verification, a new verification email has been sent.' };
  try {
    const { email } = req.body;
    const result = await query('SELECT id, email, first_name, last_name, phone, role, email_verified FROM users WHERE email=$1 AND is_active=true', [email]);
    if (!result.rows.length || result.rows[0].email_verified) return res.json(generic);
    const user = result.rows[0];
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expires = new Date(Date.now() + 15 * 60 * 1000);
    const otp = crypto.randomInt(100000, 1000000).toString();
    const otpHash = await bcrypt.hash(otp, 10);
    await query(`UPDATE users SET email_verification_token_hash=$1,email_verification_expires=$2,email_verification_otp_hash=$3,email_verification_otp_expires=$2,email_verification_otp_attempts=0 WHERE id=$4`, [tokenHash, expires, otpHash, user.id]);
    const baseUrl = getPublicSiteUrl(await getEmailSettings());
    const link = `${baseUrl.replace(/\/$/, '')}/verify-email?token=${encodeURIComponent(rawToken)}`;
    sendEmailVerificationEmail(user, link, otp).catch((e) => console.error('verification email failed:', e.message));
    res.json(generic);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to resend verification email' });
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
    const result = await query('SELECT * FROM users WHERE email=$1 AND is_active=true', [email]);
    if (!result.rows.length) return res.status(401).json({ error: 'Invalid email or password' });
    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid email or password' });
    if (user.role !== 'admin' && user.email_verified === false) {
      return res.status(403).json({ error: 'Please verify your email before signing in.', needsVerification: true, email: user.email });
    }
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

// POST /api/auth/forgot-password  (public)
// Always returns a generic success message, whether or not the email exists,
// so this endpoint can't be used to enumerate registered accounts.
router.post('/forgot-password', [
  body('email').isEmail().normalizeEmail(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: 'A valid email is required' });

  const genericResponse = { message: 'If an account exists for that email, a reset code has been sent.' };

  try {
    const { email } = req.body;
    const result = await query('SELECT id, email, first_name FROM users WHERE email = $1 AND is_active = true', [email]);
    if (!result.rows.length) return res.json(genericResponse);

    const user = result.rows[0];

    // Link-based reset (existing flow, still supported for the emailed button)
    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // OTP-based reset (new) — a random 6-digit code, hashed at rest like a
    // password so a DB read alone can't be used to reset the account.
    const otp = crypto.randomInt(100000, 1000000).toString();
    const otpHash = await bcrypt.hash(otp, 10);
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes — short-lived, it's just 6 digits

    await query(
      `UPDATE users
       SET reset_token = $1, reset_token_expires = $2,
           reset_otp_hash = $3, reset_otp_expires = $4, reset_otp_attempts = 0
       WHERE id = $5`,
      [token, expires, otpHash, otpExpires, user.id]
    );

    const baseUrl = getPublicSiteUrl(await getEmailSettings());
    const resetLink = `${baseUrl}/reset-password?token=${token}`;

    sendPasswordResetEmail(user, resetLink, otp).catch((e) => console.error('password reset email failed:', e.message));

    res.json(genericResponse);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to process request' });
  }
});

// POST /api/auth/verify-otp  (public)
// Checks the emailed 6-digit code and, if valid, hands back a normal reset
// token — so the existing /reset-password endpoint (and its expiry/consume
// logic) handles the actual password change for both flows.
router.post('/verify-otp', [
  body('email').isEmail().normalizeEmail(),
  body('otp').isLength({ min: 6, max: 6 }),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: 'A valid email and 6-digit code are required' });

  try {
    const { email, otp } = req.body;
    const result = await query(
      'SELECT id, reset_otp_hash, reset_otp_expires, reset_otp_attempts FROM users WHERE email = $1 AND is_active = true',
      [email]
    );
    const user = result.rows[0];

    // Same generic error whether the account doesn't exist, the code expired,
    // or nothing was ever requested — don't leak which case it is.
    const invalid = () => res.status(400).json({ error: 'That code is invalid or has expired' });

    if (!user || !user.reset_otp_hash || !user.reset_otp_expires) return invalid();
    if (new Date(user.reset_otp_expires) < new Date()) return invalid();
    if (user.reset_otp_attempts >= 5) return invalid();

    const valid = await bcrypt.compare(otp, user.reset_otp_hash);
    if (!valid) {
      await query('UPDATE users SET reset_otp_attempts = reset_otp_attempts + 1 WHERE id = $1', [user.id]);
      return invalid();
    }

    // Code checks out — issue a fresh reset token and clear the OTP so it
    // can't be reused, then let /reset-password finish the job.
    const resetToken = crypto.randomBytes(32).toString('hex');
    const tokenExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes to complete the reset
    await query(
      `UPDATE users
       SET reset_token = $1, reset_token_expires = $2,
           reset_otp_hash = NULL, reset_otp_expires = NULL, reset_otp_attempts = 0
       WHERE id = $3`,
      [resetToken, tokenExpires, user.id]
    );

    res.json({ resetToken });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to verify code' });
  }
});

// POST /api/auth/reset-password  (public)
router.post('/reset-password', [
  body('token').notEmpty(),
  body('password').isLength({ min: 6 }),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });

  try {
    const { token, password } = req.body;
    const result = await query(
      'SELECT id FROM users WHERE reset_token = $1 AND reset_token_expires > NOW()',
      [token]
    );
    if (!result.rows.length) {
      return res.status(400).json({ error: 'This reset link is invalid or has expired' });
    }

    const hash = await bcrypt.hash(password, 12);
    await query(
      'UPDATE users SET password_hash = $1, reset_token = NULL, reset_token_expires = NULL, updated_at = NOW() WHERE id = $2',
      [hash, result.rows[0].id]
    );

    res.json({ message: 'Password reset successfully. You can now log in with your new password.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

module.exports = router;
