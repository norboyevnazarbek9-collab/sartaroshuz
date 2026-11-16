const jwt = require('jsonwebtoken');

exports.adminLogin = async (req, res) => {
  const { password } = req.body;
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123'; // Render Environment'dan olinadi

  if (password !== ADMIN_PASSWORD) {
    return res.status(400).json({ error: "Noto'g'ri admin paroli." });
  }

  // 24 soatga amal qiluvchi token yaratish
  const token = jwt.sign(
    { role: 'admin' },
    process.env.JWT_SECRET || 'sartaroshxona_maxfiy_kalit',
    { expiresIn: '24h' }
  );

  res.json({ success: true, token });
};
