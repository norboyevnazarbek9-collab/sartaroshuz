const express = require('express');
const cors = require('cors');
const path = require('path');
const pool = require('./sartaroshxona-backend/data/db');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Boshlang'ich default tuzilish
const defaultDB = {
  users: [],
  posts: {},
  bookings: [],
  ratings: [],
  dayOffs: {},
  favorites: {},
  settings: {
    monthlyFee: 10000,
    adminCard: '8600000000000000',
    adminCardHolder: 'Admin'
  },
  subRequests: [],
  expenses: 0
};

// PostgreSQL jadvallarini tayyorlash
async function initDB() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS app_state (
        id INT PRIMARY KEY,
        data JSONB NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    const res = await pool.query('SELECT * FROM app_state WHERE id = 1;');
    if (res.rows.length === 0) {
      await pool.query(
        'INSERT INTO app_state (id, data) VALUES (1, $1);',
        [JSON.stringify(defaultDB)]
      );
      console.log(" PostgreSQL: Boshlang'ich ma'lumotlar kiritildi!");
    } else {
      console.log(" PostgreSQL: Jadvallar va ma'lumotlar tayyor!");
    }
  } catch (err) {
    console.error(" PostgreSQL initialization error:", err);
  }
}

/* =========================================================
   1. FRONTEND BILAN TO'LIQ MOS KELUVCHI ENDPOINTLAR (POSTGRESQL)
   ========================================================= */

// Barcha bazani olish (Frontend loadAsync() uchun)
app.get('/api/db', async (req, res) => {
  try {
    const result = await pool.query('SELECT data FROM app_state WHERE id = 1;');
    if (result.rows.length > 0) {
      res.json(result.rows[0].data);
    } else {
      res.json(defaultDB);
    }
  } catch (err) {
    console.error("Bazadan o'qishda xatolik:", err);
    res.status(500).json({ error: "Bazadan o'qishda xatolik yuz berdi" });
  }
});

// Barcha bazani yangilash/saqlash (Frontend saveAsync() uchun)
app.post('/api/db', async (req, res) => {
  const { data } = req.body;
  if (!data) {
    return res.status(400).json({ error: "Ma'lumot yuborilmadi" });
  }

  try {
    await pool.query(
      `INSERT INTO app_state (id, data, updated_at) 
       VALUES (1, $1, CURRENT_TIMESTAMP) 
       ON CONFLICT (id) 
       DO UPDATE SET data = EXCLUDED.data, updated_at = CURRENT_TIMESTAMP;`,
      [JSON.stringify(data)]
    );
    res.json({ success: true, message: "Baza PostgreSQL ga saqlandi" });
  } catch (err) {
    console.error("Bazaga yozishda xatolik:", err);
    res.status(500).json({ error: "Baza saqlashda xatolik yuz berdi" });
  }
});

/* =========================================================
   2. INDIVIDUAL REST API ENDPOINTLAR
   ========================================================= */

// E'lonlar ro'yxati
app.get('/api/posts', async (req, res) => {
  try {
    const result = await pool.query('SELECT data FROM app_state WHERE id = 1;');
    const db = result.rows[0]?.data || {};
    res.json(db.posts || {});
  } catch (err) {
    res.status(500).json({ error: "Xatolik" });
  }
});

// Buyurtmalar ro'yxati
app.get('/api/bookings', async (req, res) => {
  try {
    const result = await pool.query('SELECT data FROM app_state WHERE id = 1;');
    const db = result.rows[0]?.data || {};
    res.json(db.bookings || []);
  } catch (err) {
    res.status(500).json({ error: "Xatolik" });
  }
});

// Server holati
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', database: 'PostgreSQL', timestamp: new Date().toISOString() });
});

// SPA fallback (barcha noma'lum route'larni public/index.html ga yo'naltirish)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Serverni ishga tushirish
app.listen(PORT, async () => {
  await initDB();
  console.log(`=================================`);
  console.log(`🚀 Server ishga tushdi: http://localhost:${PORT}`);
  console.log(`=================================`);
});
