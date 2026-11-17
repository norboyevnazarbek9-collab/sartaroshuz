// controllers/dbController.js
const pool = require('../config/database');

// Default ma'lumotlar strukturasi (frontend'ga moslashtirildi)
const defaultData = {
  users: [],
  posts: {},       // <-- Obyekt {} bo'lishi shart!
  bookings: [],
  settings: { adminCard: "8600000000000000", monthlyFee: 10000, adminCardHolder: "Admin" },
  dayOffs: {},     // Obyekt {}
  ratings: [],
  favorites: {},   // Obyekt {}
  subRequests: [],
  expenses: 0
};

// Bazadan ma'lumotlarni olish
exports.getDatabaseData = async (req, res, next) => {
  try {
    const result = await pool.query('SELECT data FROM app_state WHERE id = 1');
    if (result.rows.length > 0 && result.rows[0].data && Object.keys(result.rows[0].data).length > 0) {
      let data = result.rows[0].data;
      
      // Tuzilmalar to'g'riligini xavfsiz tekshirish
      if (!Array.isArray(data.users)) data.users = [];
      if (!data.posts || typeof data.posts !== 'object' || Array.isArray(data.posts)) data.posts = {}; // <-- Obyekt sifatida saqlash
      if (!Array.isArray(data.bookings)) data.bookings = [];
      if (!Array.isArray(data.ratings)) data.ratings = [];
      if (!data.dayOffs || typeof data.dayOffs !== 'object') data.dayOffs = {};
      if (!data.favorites || typeof data.favorites !== 'object') data.favorites = {};
      if (!Array.isArray(data.subRequests)) data.subRequests = [];
      if (typeof data.expenses !== 'number') data.expenses = 0;

      res.json(data);
    } else {
      res.json(defaultData);
    }
  } catch (err) {
    next(err);
  }
};

// Bazaga ma'lumot saqlash (XAVFSIZLIK SOZLANGAN)
exports.saveDatabaseData = async (req, res, next) => {
  const newData = req.body;

  // 1. Ma'lumot obyekti mavjudligini tekshirish
  if (!newData || typeof newData !== 'object') {
    return res.status(400).json({ error: "Noto'g'ri ma'lumot formati" });
  }

  // 2. XAVFSIZLIK: Bo'sh obyekt kelganda bazani nollab qo'ymaslik uchun bloklash!
  if (Object.keys(newData).length === 0) {
    return res.status(400).json({ error: "Bo'sh ma'lumotni bazaga saqlab bo'lmaydi." });
  }

  // 3. XAVFSIZLIK: Muhim massivlar/obyektlar kelmagan bo'lsa, bazaga saqlashga yo'l qo'ymaslik
  if (!newData.users && !newData.bookings && !newData.posts) {
    return res.status(400).json({ error: "Noto'g'ri ma'lumot tuzilishi." });
  }

  try {
    await pool.query(
      'INSERT INTO app_state (id, data) VALUES (1, $1) ON CONFLICT (id) DO UPDATE SET data = $1',
      [JSON.stringify(newData)]
    );
    res.json({ success: true, message: "Ma'lumotlar muvaffaqiyatli saqlandi" });
  } catch (err) {
    next(err);
  }
};
