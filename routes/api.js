const express = require('express');
const router = express.Router();
const pool = require('../config/database');

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

router.get('/db', async (req, res, next) => {
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
    next(err);
  }
});

router.post('/db', async (req, res, next) => {
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
    next(err);
  }
});

module.exports = router;
