const express = require('express');
const router = express.Router();
const dbController = require('../controllers/dbController');
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/auth');

// Ochiq yo'nalishlar (Mijozlar uchun)
router.get('/db', dbController.getDatabaseData);
router.get('/', dbController.getDatabaseData);

// Admin avtorizatsiyasi
router.post('/login', authController.adminLogin);

// Himoyalangan yo'nalishlar (Faqat admin saqlashi mumkin)
router.post('/db', authMiddleware, dbController.saveDatabaseData);
router.post('/', authMiddleware, dbController.saveDatabaseData);

module.exports = router;
