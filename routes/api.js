// routes/api.js
const express = require('express');
const router = express.Router();
const dbController = require('../controllers/dbController');

// GET /api/db — Ma'lumotlarni olish
router.get('/db', dbController.getDatabaseData);

// POST /api/db — Ma'lumotlarni saqlash
router.post('/db', dbController.saveDatabaseData);

module.exports = router;
