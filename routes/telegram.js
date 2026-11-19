const express = require('express');
const TelegramBot = require('node-telegram-bot-api');
const pool = require('../config/database');

const router = express.Router();
const BOT_TOKEN = process.env.BOT_TOKEN;

if (!BOT_TOKEN) {
  console.error('BOT_TOKEN topilmadi! Telegram kod yuborish ishlamaydi.');
  module.exports = router;
  return;
}

// 998901234567 ko'rinishiga keltirish
const norm = s => { const d = String(s || '').replace(/\D/g, ''); return d.length === 9 ? '998' + d : d; };

// Raqam -> chat_id jadvali (Postgres'da saqlanadi, deploy'da o'chmaydi)
pool.query(`
  CREATE TABLE IF NOT EXISTS tg_chats (
    phone TEXT PRIMARY KEY,
    chat_id BIGINT NOT NULL
  );
`).then(() => console.log("'tg_chats' jadvali tayyor."))
  .catch(e => console.error('tg_chats xatolik:', e));

const bot = new TelegramBot(BOT_TOKEN, { polling: true });
bot.on('polling_error', e => console.error('polling:', e.message));

bot.onText(/\/start/, msg => {
  bot.sendMessage(msg.chat.id,
    "Salom! Ro'yxatdan o'tish uchun pastdagi tugma orqali raqamingizni ulashing 👇",
    { reply_markup: { keyboard: [[{ text: '📱 Raqamni ulashish', request_contact: true }]],
                      resize_keyboard: true, one_time_keyboard: true } });
});

bot.on('contact', async msg => {
  const c = msg.contact;
  if (c.user_id !== msg.from.id) return bot.sendMessage(msg.chat.id, "Faqat o'z raqamingizni ulashing.");
  try {
    await pool.query(
      `INSERT INTO tg_chats (phone, chat_id) VALUES ($1, $2)
       ON CONFLICT (phone) DO UPDATE SET chat_id = EXCLUDED.chat_id`,
      [norm(c.phone_number), msg.chat.id]
    );
    bot.sendMessage(msg.chat.id, "✅ Raqam saqlandi. Endi saytga qaytib, «Kod yuborish» tugmasini bosing.",
      { reply_markup: { remove_keyboard: true } });
  } catch (e) {
    console.error(e);
    bot.sendMessage(msg.chat.id, "Xatolik yuz berdi, qayta urinib ko'ring.");
  }
});

const codes = {}; // phone -> { code, exp, tries, last }

router.post('/send-code', async (req, res) => {
  try {
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
    codes[phone] = { code, exp: Date.now() + 5 * 60 * 1000, tries: 0, last: Date.now() };
    await bot.sendMessage(r.rows[0].chat_id, `🔐 Sartaroshxona tasdiqlash kodi: ${code}\nKod 5 daqiqa amal qiladi.`);
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
