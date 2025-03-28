const express = require('express');
const router = express.Router();
const reminderController = require('../controllers/reminderController');

// Route for handling incoming WhatsApp messages
router.post('/webhook', reminderController.processMessage);

module.exports = router; 