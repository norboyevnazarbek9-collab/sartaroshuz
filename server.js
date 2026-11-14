const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_PATH = path.join(__dirname, 'data', 'db.json');

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Boshlang'ich db.json mavjudligini va tuzilishini tekshirish
function initDB() {
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

  if (!fs.existsSync(path.dirname(DB_PATH))) {
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  }

  if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify(defaultDB, null, 2), 'utf8');
  }
}

// Bazadan o'qish
function readDB() {
  try {
    initDB();
    const data = fs.readFileSync(DB_PATH, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    console.error("Bazani o'qishda xatolik:", err);
    return {};
  }
}

// Bazaga yozish
function writeDB(data) {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error("Bazaga yozishda xatolik:", err);
    return false;
  }
}

/* =========================================================
   1. FRONTEND BILAN TO'LIQ MOS KELUVCHI ENDPOINTLAR (MONOLITH)
   ========================================================= */

// Barcha bazani olish (Frontend loadAsync() uchun)
app.get('/api/db', (req, res) => {
  const db = readDB();
  res.json(db);
});

// Barcha bazani yangilash/saqlash (Frontend saveAsync() uchun)
app.post('/api/db', (req, res) => {
  const { data } = req.body;
  if (!data) {
    return res.status(400).json({ error: "Ma'lumot yuborilmadi" });
  }

  const success = writeDB(data);
  if (success) {
    res.json({ success: true, message: "Baza saqlandi" });
  } else {
    res.status(500).json({ error: "Baza saqlashda xatolik yuz berdi" });
  }
});

/* =========================================================
   2. INDIVIDUAL REST API ENDPOINTLAR (Ixtiyoriy kengaytirish)
   ========================================================= */

// E'lonlar ro'yxati
app.get('/api/posts', (req, res) => {
  const db = readDB();
  res.json(db.posts || {});
});

// Buyurtmalar ro'yxati
app.get('/api/bookings', (req, res) => {
  const db = readDB();
  res.json(db.bookings || []);
});

// Server holati
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// SPA fallback (barcha noma'lum route'larni public/index.html ga yo'naltirish)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Serverni ishga tushirish
app.listen(PORT, () => {
  console.log(`=================================`);
  console.log(`🚀 Server ishga tushdi: http://localhost:${PORT}`);
  console.log(`=================================`);
});
