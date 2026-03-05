const { Pool } = require('pg');

function shouldUseSsl() {
  const url = process.env.DATABASE_URL || '';
  const sslMode = (process.env.PGSSLMODE || '').toLowerCase();
  return sslMode === 'require' || url.includes('sslmode=require');
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: shouldUseSsl() ? { rejectUnauthorized: false } : undefined,
  max: parseInt(process.env.PG_POOL_MAX || '10', 10),
  idleTimeoutMillis: parseInt(process.env.PG_POOL_IDLE_TIMEOUT_MS || '30000', 10),
  connectionTimeoutMillis: parseInt(process.env.PG_POOL_CONNECT_TIMEOUT_MS || '5000', 10),
});

pool.on('error', (err) => {
  // Jangan crash proses pada idle client error.
  console.error('PostgreSQL pool error:', err.message);
});

async function query(text, params = []) {
  return pool.query(text, params);
}

module.exports = { pool, query };
