const mongoose = require('mongoose');

const reminderSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    // This will store the user's WhatsApp number
  },
  text: {
    type: String,
    required: true,
  },
  reminderTime: {
    type: Date,
    required: true,
  },
  isCompleted: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  }
});

module.exports = mongoose.model('Reminder', reminderSchema); 