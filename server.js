require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cron = require('node-cron');
const connectDB = require('./config/db');
const webhookRoutes = require('./routes/webhookRoutes');
const reminderController = require('./controllers/reminderController');

// Connect to MongoDB
connectDB();

const app = express();

// Middleware
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// Add request logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  console.log('Request Headers:', req.headers);
  if (req.method === 'POST') {
    console.log('Request Body:', req.body);
  }
  next();
});

// Welcome route
app.get('/', (req, res) => {
  res.send('WhatsApp Reminder Bot API is running');
});

// Routes
app.use('/api', webhookRoutes);

// Direct webhook route (for testing)
app.post('/webhook', reminderController.processMessage);

// Set up cron job to check for reminders every minute
cron.schedule('* * * * *', () => {
  console.log('Running cron job to check reminders');
  reminderController.checkReminders();
});

// Start server
const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  // console.log(`Webhook URL: http://localhost:${PORT}/webhook`);
  // console.log(`API Routes URL: http://localhost:${PORT}/api/webhook`);
  // console.log('Update your Twilio WhatsApp Sandbox webhook to point to one of these URLs with your ngrok domain.');
}); 