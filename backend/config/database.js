const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  // 2s was too aggressive: hosted/serverless Postgres (e.g. Neon) can take
  // several seconds to wake a connection after it's gone idle, which was
  // causing sporadic "Failed to update order status" errors on the admin
  // panel whenever the pool had to reconnect.
  connectionTimeoutMillis: 10000,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

const query = (text, params) => pool.query(text, params);

const getClient = () => pool.connect();

module.exports = { query, getClient, pool };
