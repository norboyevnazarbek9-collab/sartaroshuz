app.post('/api/db', async (req, res) => {
  const newData = req.body;

  // HIMOYA: Agar kelayotgan ma'lumot bo'sh bo'lsa, bazani o'chirib yubormaslik
  if (!newData || Object.keys(newData).length === 0) {
    return res.status(400).json({ error: "Bo'sh ma'lumot qabul qilinmaydi" });
  }

  try {
    // Avval bazadagi eski ma'lumotni tekshiramiz
    const current = await pool.query('SELECT data FROM app_state WHERE id = 1');
    const oldData = current.rows[0]?.data || {};

    // Agar oldin foydalanuvchilar ko'p bo'lib, hozir birdaniga 0 ta kelayotgan bo'lsa, bloklaymiz!
    if ((oldData.users?.length > 0 && (!newData.users || newData.users.length === 0)) ||
        (oldData.posts?.length > 0 && (!newData.posts || newData.posts.length === 0))) {
      console.error("DIQQAT: Bazani nolga tushirishga urinish bloklandi!");
      return res.status(409).json({ error: "Ma'lumotlar yo'qolishining oldi olindi" });
    }

    await pool.query(
      'INSERT INTO app_state (id, data) VALUES (1, $1) ON CONFLICT (id) DO UPDATE SET data = $1',
      [JSON.stringify(newData)]
    );
    res.json({ success: true });
  } catch (err) {
    console.error("DB saqlashda xato:", err);
    res.status(500).json({ error: err.message });
  }
});
