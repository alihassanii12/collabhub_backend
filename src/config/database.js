const { Pool } = require('pg');

// Use DATABASE_URL from environment variables
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 10,
  idleTimeoutMillis: 30000,
});

pool.on('error', (err) => {
  console.error('Database error:', err);
});

module.exports = { query: (text, params) => pool.query(text, params), pool };