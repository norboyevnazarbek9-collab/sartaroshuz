// server.js
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const pool = require('./config/database'); // Yangi yaratgan bazamizni ulaymiz

const app = express();
const PORT = process.env.PORT || 3000;

// Xavfsizlik sarlavhalari
app.use(helmet());

// CORS ruxsat etilgan domenlar
const allowedOrigins = [
  'https://sartaroshuz.onrender.com',
  'http://localhost:3000',
  'http://localhost:5173'
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV !== 'production') {
      callback(null, true);
    } else {
      callback(new Error('CORS siyosati tomonidan bloklandi'));
    }
  },
  credentials: true
}));

// Rate Limit (Spam so'rovlardan himoya)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  message: { error: "Juda ko'p so'rov yuborildi. Iltimos, biroz kuting." }
});
app.use('/api/', limiter);

app.use(express.json({ limit: '10mb' }));
app.use(express.static('public')); // Frontend fayllarini ulash

// Bazada jadval mavjudligini tekshirish
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

// Default (zaxira) ma'lumotlar strukturasi
const defaultData = {
  users: [],
  posts: [],
  bookings: [],
  settings: { adminCard: "8600000000000000", monthlyFee: 10000, adminCardHolder: "Admin" },
  dayOffs: {},
  ratings: [],
  favorites: {},
  subRequests: []
};

// Endpoints
app.get('/', (req, res) => {
  res.status(200).send('Smart Sartaroshxona Backend modulli arxitekturada ishlayapti! 🚀');
});

app.get('/api/health', (req, res) => {
  res.status(200).json({ status: "OK", uptime: process.uptime(), timestamp: new Date() });
});

// Ma'lumotlarni bazadan olish
app.get('/api/db', async (req, res) => {
  try {
    const result = await pool.query('SELECT data FROM app_state WHERE id = 1');
    if (result.rows.length > 0 && result.rows[0].data) {
      let data = result.rows[0].data;
      if (!Array.isArray(data.users)) data.users = [];
      if (!Array.isArray(data.posts)) data.posts = [];
      if (!Array.isArray(data.bookings)) data.bookings = [];
      res.json(data);
    } else {
      res.json(defaultData);
    }
  } catch (err) {
    console.error("Ma'lumotlarni olishda xato:", err);
    res.status(500).json({ error: err.message });
  }
});

// Ma'lumotlarni saqlash
app.post('/api/db', async (req, res) => {
  const newData = req.body;
  if (!newData || typeof newData !== 'object') {
    return res.status(400).json({ error: "Noto'g'ri ma'lumot formati" });
  }

  try {
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

app.listen(PORT, () => {
  console.log(`Server ${PORT}-portda modulli tartibda ishga tushdi!`);
});
