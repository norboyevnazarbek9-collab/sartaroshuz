const express = require('express');
const router = express.Router();
const dbController = require('../controllers/dbController');
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/auth');

// Public yo'nalishlar (barcha foydalanuvchilar o'qishi uchun)
router.get('/db', dbController.getDatabaseData);
router.get('/', dbController.getDatabaseData);

// Admin login
router.post('/login', authController.adminLogin);

// Protected yo'nalishlar (faqat token bo'lsa ma'lumot saqlanadi)
router.post('/db', authMiddleware, dbController.saveDatabaseData);
router.post('/', authMiddleware, dbController.saveDatabaseData);

module.exports = router;
