// routes/api.js
const express = require('express');
const router = express.Router();
const dbController = require('../controllers/dbController');

// Barcha /api va /api/db so'rovlariga ruxsat berish
router.get('/db', dbController.getDatabaseData);
router.post('/db', dbController.saveDatabaseData);

// Agar frontend shunchaki /api so'rasa
router.get('/', dbController.getDatabaseData);
router.post('/', dbController.saveDatabaseData);

module.exports = router;
