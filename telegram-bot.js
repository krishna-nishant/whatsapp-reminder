require('dotenv').config();
const connectDB = require('./config/db');
const telegramController = require('./controllers/telegramController');
const cron = require('node-cron');
const reminderController = require('./controllers/reminderController');

// Connect to MongoDB
connectDB();

// Setup and launch the Telegram bot
const bot = telegramController.setupBot();
telegramController.launchBot();

// Set up cron job to check for reminders every minute
cron.schedule('* * * * *', () => {
  console.log('Running cron job to check Telegram reminders');
  checkTelegramReminders();
});

// Function to check and send Telegram reminders
const checkTelegramReminders = async () => {
  try {
    const now = new Date();
    
    // Find reminders that are due but not yet completed
    const Reminder = require('./models/Reminder');
    const dueReminders = await Reminder.find({
      reminderTime: { $lte: now },
      isCompleted: false,
      userId: { $regex: '^telegram:' } // Only get Telegram reminders
    });

    console.log(`Found ${dueReminders.length} due Telegram reminders`);

    // Send each due reminder
    for (const reminder of dueReminders) {
      await telegramController.sendReminder(reminder);
    }
  } catch (error) {
    console.error('Error checking Telegram reminders:', error);
  }
};

// Log startup
console.log('Telegram Reminder Bot is running');

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM')); 