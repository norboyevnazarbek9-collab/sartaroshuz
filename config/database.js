const { Pool } = require('pg');

// DATABASE_URL ichidagi ?sslmode=... ni olib tashlaymiz,
// aks holda u pastdagi ssl sozlamasini bekor qilib yuboradi
const url = new URL(process.env.DATABASE_URL);
url.searchParams.delete('sslmode');

const pool = new Pool({
  connectionString: url.toString(),
  ssl: { rejectUnauthorized: false }
});

module.exports = pool;
