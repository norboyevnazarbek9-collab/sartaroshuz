const jwt = require('jsonwebtoken');

module.exports = function (req, res, next) {
  // So'rov sarlavhasidan token o'qiladi
  const token = req.header('Authorization');

  if (!token) {
    return res.status(401).json({ error: "Ruxsat yo'q, token topilmadi." });
  }

  try {
    const cleanToken = token.replace('Bearer ', '');
    const decoded = jwt.verify(cleanToken, process.env.JWT_SECRET || 'sartaroshxona_maxfiy_kalit');
    req.admin = decoded;
    next();
  } catch (err) {
    res.status(400).json({ error: "Yaroqsiz token." });
  }
};
