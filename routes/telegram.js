const express = require('express');
const pool = require('../config/database');

const router = express.Router();
const BOT_TOKEN = process.env.BOT_TOKEN;
const API_SECRET = process.env.BOT_API_SECRET;

// 998901234567 ko'rinishiga keltirish
const norm = s => { const d = String(s || '').replace(/\D/g, ''); return d.length === 9 ? '998' + d : d; };

pool.query(`
  CREATE TABLE IF NOT EXISTS tg_chats (
    phone TEXT PRIMARY KEY,
    chat_id BIGINT NOT NULL
  );
`).then(() => console.log("'tg_chats' jadvali tayyor."))
  .catch(e => console.error('tg_chats xatolik:', e));

// Python bot raqamni shu yerga yuboradi
router.post('/tg-link', async (req, res) => {
  if (!API_SECRET || req.get('X-Bot-Secret') !== API_SECRET) {
    return res.status(401).json({ message: 'Ruxsat berilmagan' });
  }
  const phone = norm(req.body.phone), chatId = req.body.chatId;
  if (!phone || !chatId) return res.status(400).json({ message: 'phone va chatId majburiy' });
  try {
    await pool.query(
      `INSERT INTO tg_chats (phone, chat_id) VALUES ($1, $2)
       ON CONFLICT (phone) DO UPDATE SET chat_id = EXCLUDED.chat_id`,
      [phone, chatId]
    );
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Saqlab bo\'lmadi' });
  }
});

const codes = {}; // phone -> { code, exp, tries, last }

router.post('/send-code', async (req, res) => {
  try {
    if (!BOT_TOKEN) return res.status(500).json({ message: 'Bot sozlanmagan' });
    const phone = norm(req.body.phone);
    const r = await pool.query('SELECT chat_id FROM tg_chats WHERE phone = $1', [phone]);
    if (!r.rows.length) {
      return res.status(404).json({ message: "Bu raqam botda topilmadi. Avval botga kirib Start bosing va raqamingizni ulashing." });
    }
    const old = codes[phone];
    if (old && Date.now() - old.last < 30000) {
      return res.status(429).json({ message: "Biroz kuting va qayta urinib ko'ring (30 soniya)." });
    }
    const code = String(Math.floor(100000 + Math.random() * 900000));

    const tg = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: r.rows[0].chat_id,
        text: `🔐 Sartaroshxona tasdiqlash kodi: ${code}\nKod 5 daqiqa amal qiladi. Uni hech kimga bermang.`
      })
    });
    const data = await tg.json();
    if (!data.ok) {
      console.error('Telegram xato:', data);
      return res.status(500).json({ message: "Botga yuborib bo'lmadi" });
    }

    codes[phone] = { code, exp: Date.now() + 5 * 60 * 1000, tries: 0, last: Date.now() };
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Botga yuborib bo'lmadi" });
  }
});

router.post('/verify-code', (req, res) => {
  const phone = norm(req.body.phone), c = codes[phone];
  if (!c || Date.now() > c.exp) return res.status(400).json({ message: "Kod muddati tugagan. Qayta yuboring" });
  if (++c.tries > 5) { delete codes[phone]; return res.status(429).json({ message: "Juda ko'p urinish. Kodni qayta yuboring" }); }
  if (String(req.body.code).trim() !== c.code) return res.status(400).json({ message: "Kod xato" });
  delete codes[phone];
  res.json({ ok: true });
});

module.exports = router;
