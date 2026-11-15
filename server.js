const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3000;

// CORS va JSON hajmini kengaytirish (katta ma'lumotlar sig'ishi uchun)
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// PostgreSQL bazasiga ulanish (Render / Supabase / Neon uchun)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Bazada jadval mavjudligini tekshirish va yaratish
async function initDB() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS app_state (
        id INT PRIMARY KEY,
        data JSONB
      );
    `);
    console.log("PostgreSQL bazasi va 'app_state' jadvali muvaffaqiyatli tayyorlandi.");
  } catch (err) {
    console.error("Bazani yaratishda xatolik:", err);
  }
}
initDB();

// 1. Health check (Cron-job uxlab qolmasligi uchun va server ishlayotganini tekshirish)
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: "OK", uptime: process.uptime(), timestamp: new Date() });
});

// 2. GET /api/db — Barcha ma'lumotlarni bazadan yuklab berish
app.get('/api/db', async (req, res) => {
  try {
    const result = await pool.query('SELECT data FROM app_state WHERE id = 1');
    if (result.rows.length > 0) {
      res.json(result.rows[0].data);
    } else {
      // Agar baza bo'sh bo'lsa boshlang'ich obyekt qaytaramiz
      res.json({ users: [], posts: [], bookings: [] });
    }
  } catch (err) {
    console.error("Ma'lumotlarni olishda xato:", err);
    res.status(500).json({ error: err.message });
  }
});

// 3. POST /api/db — Ma'lumotlarni xavfsiz saqlash (Nolga tushib ketishdan himoyalangan)
app.post('/api/db', async (req, res) => {
  const newData = req.body;

  // Himoya 1: Kelayotgan ma'lumot umuman bo'sh bo'lsa rad etamiz
  if (!newData || Object.keys(newData).length === 0) {
    return res.status(400).json({ error: "Bo'sh ma'lumot qabul qilinmaydi" });
  }

  try {
    // Bazadagi eski ma'lumotlarni tekshiramiz
    const current = await pool.query('SELECT data FROM app_state WHERE id = 1');
    const oldData = current.rows[0]?.data || {};

    const oldUsersCount = oldData.users?.length || 0;
    const newUsersCount = newData.users?.length || 0;

    // Himoya 2: Agar oldin foydalanuvchilar/e'lonlar bo'lib, yangisida birdaniga hammasi 0 (bo'sh) bo'lib kelayotgan bo'lsa — bazani o'chib ketishidan saqlab qolamiz
    if (oldUsersCount > 5 && newUsersCount === 0) {
      console.error("DIQQAT: Bazadagi ma'lumotlarni tasodifan o'chirib yuborish (0 ta qilish) urinishi bloklandi!");
      return res.status(409).json({ error: "Ma'lumotlar yo'qolishining oldi olindi (bo'sh ma'lumot rad etildi)" });
    }

    // Ma'lumotni PostgreSQL'ga yozish yoki yangilash
    await pool.query(
      'INSERT INTO app_state (id, data) VALUES (1, $1) ON CONFLICT (id) DO UPDATE SET data = $1',
      [JSON.stringify(newData)]
    );

    res.json({ success: true, message: "Ma'lumotlar muvaffaqiyatli saqlandi" });
  } catch (err) {
    console.error("Ma'lumotni saqlashda xato:", err);
    res.status(500).json({ error: err.message });
  }
});

// Serverni ishga tushirish
app.listen(PORT, () => {
  console.log(`Server ${PORT}-portda muvaffaqiyatli ishga tushdi!`);
});
