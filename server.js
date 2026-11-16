const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3000;

// CORS va JSON hajmini kengaytirish
app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.use(express.static('public'));

// PostgreSQL bazasiga ulanish
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

// 0. Asosiy sahifa
app.get('/', (req, res) => {
  res.status(200).send('Smart Sartaroshxona Backend Server muvaffaqiyatli ishlayapti! 🚀');
});

// 1. Health check
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
      // posts massiv ([]) ko'rinishida qaytariladi
      res.json({ users: [], posts: [], bookings: [], settings: {} });
    }
  } catch (err) {
    console.error("Ma'lumotlarni olishda xato:", err);
    res.status(500).json({ error: err.message });
  }
});

// 3. POST /api/db — Ma'lumotlarni xavfsiz saqlash (HIMOYALANGAN)
app.post('/api/db', async (req, res) => {
  const newData = req.body;

  if (!newData || typeof newData !== 'object') {
    return res.status(400).json({ error: "Noto'g'ri ma'lumot formati" });
  }

  try {
    // Bazadagi hozirgi ma'lumotlarni olib tekshiramiz
    const current = await pool.query('SELECT data FROM app_state WHERE id = 1');
    const oldData = current.rows[0]?.data || {};

    const oldPostsCount = Array.isArray(oldData.posts) ? oldData.posts.length : 0;
    const newPostsCount = Array.isArray(newData.posts) ? newData.posts.length : 0;

    const oldUsersCount = Array.isArray(oldData.users) ? oldData.users.length : 0;
    const newUsersCount = Array.isArray(newData.users) ? newData.users.length : 0;

    // XAVFSIZLIK: Agar bazada oldin e'lonlar yoki foydalanuvchilar bo'lib, 
    // kelayotgan yangi ma'lumot ularni to'satdan 0 (bo'sh) qilib yubormoqchi bo'lsa — RAD ETAMIZ!
    if ((oldPostsCount > 0 && newPostsCount === 0) || (oldUsersCount > 0 && newUsersCount === 0)) {
      console.error("⚠️ DIQQAT: Bazadagi mavjud e'lonlar/foydalanuvchilarni tasodifan o'chirib yuborish urunishi bloklandi!");
      return res.status(409).json({ 
        error: "Ma'lumotlar yo'qolishining oldi olindi", 
        restoredData: oldData 
      });
    }

    // Xavfsiz saqlash
    await pool.query(
      'INSERT INTO app_state (id, data) VALUES (1, $1) ON CONFLICT (id) DO UPDATE SET data = $1',
      [JSON.stringify(newData)]
    );

    res.json({ success: true, message: "Ma'lumotlar muvaffaqiyatli va xavfsiz saqlandi" });
  } catch (err) {
    console.error("Ma'lumotni saqlashda xato:", err);
    res.status(500).json({ error: err.message });
  }
});

// Serverni ishga tushirish
app.listen(PORT, () => {
  console.log(`Server ${PORT}-portda muvaffaqiyatli ishga tushdi!`);
});
