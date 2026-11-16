// server.js
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const pool = require('./config/database');
const apiRoutes = require('./routes/api');
const errorHandler = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 3000;

// Helmet sozlamasi (Frontend skriptlari va stillari bloklanib qolmasligi uchun)
app.use(helmet({
  contentSecurityPolicy: false
}));

// CORS barcha so'rovlar uchun ochiq qilinadi
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: { error: "Juda ko'p so'rov yuborildi." }
});
app.use('/api/', limiter);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static fayllar (public papka)
app.use(express.static('public'));

// DB jadvalini tekshirish
async function initDB() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS app_state (
        id INT PRIMARY KEY,
        data JSONB
      );
    `);
    console.log("PostgreSQL bazasi va 'app_state' jadvali tayyor.");
  } catch (err) {
    console.error("Bazani yaratishda xatolik:", err);
  }
}
initDB();

app.get('/api/health', (req, res) => {
  res.status(200).json({ status: "OK", uptime: process.uptime(), timestamp: new Date() });
});

// Routes va Middleware
app.use('/api', apiRoutes);
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server ${PORT}-portda muvaffaqiyatli ishga tushdi!`);
});
