const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

pool.on('connect', () => {
  console.log("PostgreSQL bazasiga (Supabase) muvaffaqiyatli ulandi.");
});

pool.on('error', (err) => {
  console.error("PostgreSQL ulanishida kutilmagan xatolik:", err);
});

module.exports = pool;
