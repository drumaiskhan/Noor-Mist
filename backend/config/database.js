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
  // Keep the TCP connection alive so serverless Postgres providers (Neon,
  // Supabase, etc.) don't silently drop it mid-request after a period of
  // inactivity — that drop is what was surfacing as a generic 500 on the
  // very next query (e.g. the order status PUT).
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,
});

pool.on('error', (err) => {
  // A dropped/idle connection error fires here asynchronously, outside of
  // any in-flight request — log it but don't crash the process, the pool
  // will open a fresh connection on the next query.
  console.error('Unexpected error on idle client', err);
});

// Errors that mean "the connection died / was never really usable" rather
// than "the query itself is wrong" — safe to transparently retry once.
function isTransientError(err) {
  const code = err?.code;
  const message = err?.message || '';
  return (
    code === 'ECONNRESET' ||
    code === 'ETIMEDOUT' ||
    code === 'EPIPE' ||
    code === '57P01' || // admin shutdown
    code === '57P02' || // crash shutdown
    code === '57P03' || // cannot connect now (server starting up)
    /Connection terminated/i.test(message) ||
    /connection is not queryable/i.test(message) ||
    /server closed the connection/i.test(message) ||
    /timeout exceeded when trying to connect/i.test(message)
  );
}

async function query(text, params) {
  try {
    return await pool.query(text, params);
  } catch (err) {
    if (isTransientError(err)) {
      // Give a sleeping/serverless DB a moment to finish waking up, then
      // retry exactly once before giving up and surfacing the error.
      await new Promise((resolve) => setTimeout(resolve, 600));
      return pool.query(text, params);
    }
    throw err;
  }
}

const getClient = () => pool.connect();

module.exports = { query, getClient, pool };
