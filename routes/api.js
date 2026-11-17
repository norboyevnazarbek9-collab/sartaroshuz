const express = require('express');
const router = express.Router();
const dbController = require('../controllers/dbController');
const authController = require('../controllers/authController');

// Ochiq yo'nalishlar
router.get('/db', dbController.getDatabaseData);
router.get('/', dbController.getDatabaseData);

// Admin login
router.post('/login', authController.adminLogin);

// Ma'lumot saqlash yo'nalishi
router.post('/db', dbController.saveDatabaseData);
router.post('/', dbController.saveDatabaseData);

module.exports = router;
