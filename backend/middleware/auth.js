const jwt = require('jsonwebtoken');
const { query } = require('../config/database');

const JWT_SECRET = process.env.JWT_SECRET || process.env.SESSION_SECRET || 'noor-mist-secret-key';

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    const result = await query('SELECT id, email, first_name, last_name, role, phone FROM users WHERE id = $1', [decoded.id]);
    if (!result.rows.length) {
      return res.status(401).json({ error: 'User not found' });
    }
    req.user = result.rows[0];
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

const requireAdmin = async (req, res, next) => {
  await authenticate(req, res, () => {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    next();
  });
};

const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, JWT_SECRET);
      const result = await query('SELECT id, email, first_name, last_name, role FROM users WHERE id = $1', [decoded.id]);
      if (result.rows.length) req.user = result.rows[0];
    }
  } catch {}
  next();
};

const generateToken = (userId) => {
  return jwt.sign({ id: userId }, JWT_SECRET, { expiresIn: '30d' });
};

module.exports = { authenticate, requireAdmin, optionalAuth, generateToken };
