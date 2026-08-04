require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');

const { initDatabase } = require('./database/init');

const app = express();

app.set('trust proxy', 1);

const PORT = process.env.PORT || 3001;

// ================================
// Security
// ================================

app.use(
  helmet({
    crossOriginResourcePolicy: {
      policy: 'cross-origin',
    },
  })
);

app.use(
  cors({
    origin: process.env.CORS_ORIGIN || true,
    credentials: true,
    methods: [
      'GET',
      'POST',
      'PUT',
      'DELETE',
      'PATCH',
      'OPTIONS',
    ],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
    ],
  })
);

// ================================
// Rate Limiter
// ================================

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', limiter);

// ================================
// Body Parser
// ================================

app.use(
  express.json({
    limit: '10mb',
  })
);

app.use(
  express.urlencoded({
    extended: true,
    limit: '10mb',
  })
);

// ================================
// Logger
// ================================

if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

// ================================
// Static Uploads
// ================================

app.use(
  '/uploads',
  express.static(path.join(__dirname, 'uploads'))
);

// ================================
// API ROUTES
// ================================

app.use('/api/auth', require('./routes/auth'));

app.use('/api/products', require('./routes/products'));

app.use('/api/categories', require('./routes/categories'));

app.use('/api/collections', require('./routes/collections'));

// ⭐⭐⭐ NEW ROUTE ⭐⭐⭐
app.use('/api/announcements', require('./routes/announcements'));

app.use('/api/orders', require('./routes/orders'));

app.use('/api/reviews', require('./routes/reviews'));

app.use('/api/users', require('./routes/customers'));

app.use('/api/themes', require('./routes/themes'));

app.use('/api/homepage', require('./routes/homepage'));

app.use('/api/analytics', require('./routes/analytics'));

app.use('/api/inventory', require('./routes/inventory'));

app.use('/api/seo', require('./routes/seo'));

app.use('/api/upload', require('./routes/upload'));

app.use('/api/coupons', require('./routes/coupons'));

app.use('/api/notifications', require('./routes/notifications'));

app.use('/api/settings', require('./routes/settings'));

app.use('/api/media', require('./routes/media'));

app.use('/api/email', require('./routes/email'));

app.use('/api/pages', require('./routes/pages'));

app.use('/api/payments', require('./routes/payments'));

app.use('/api/bank-settings', require('./routes/bankSettings'));

// ================================
// Health Check
// ================================

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date(),
  });
});

// ================================
// 404
// ================================

app.use('/api/*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
  });
});

// ================================
// Global Error Handler
// ================================

app.use((err, req, res, next) => {
  console.error(err.stack);

  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
  });
});

// ================================
// Start Server
// ================================

async function start() {
  await initDatabase();

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Noor Mist API running on port ${PORT}`);
  });
}

start().catch(console.error);
