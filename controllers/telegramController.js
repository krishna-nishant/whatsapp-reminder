const Reminder = require('../models/Reminder');
const { Telegraf } = require('telegraf');
const chrono = require('chrono-node');

// Initialize Telegram bot
const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);

// Parse the message to extract reminder text and time using NLP
const parseReminderMessage = (message) => {
  console.log('Parsing message:', message);

  // Use Chrono to find date/time references in the message
  const parsedDates = chrono.parse(message);

  if (!parsedDates || parsedDates.length === 0) {
    console.log('No date/time found in the message');
    return null;
  }

  // Get the first parsed date
  const parsedDate = parsedDates[0];
  const reminderTime = parsedDate.start.date();

  // If the time is in the past, assume it's for the next occurrence
  const now = new Date();
  if (reminderTime < now) {
    console.log('Parsed time is in the past, adjusting to future');
    // For simple times like "9am" without a specific date, add a day
    if (parsedDate.start.knownValues.day === undefined) {
      reminderTime.setDate(reminderTime.getDate() + 1);
    }
  }

  // Extract the reminder text by removing the date/time part
  let reminderText = message;

  // Remove common phrases that indicate a reminder
  const reminderPhrases = [
    /remind me to /i,
    /remind me /i,
    /reminder to /i,
    /remind /i,
    /set a reminder to /i,
    /set reminder to /i,
    /set a reminder for /i
  ];

  // Apply each replacement
  for (const phrase of reminderPhrases) {
    reminderText = reminderText.replace(phrase, '');
  }

  // Remove the date/time part from the text
  reminderText = reminderText.replace(parsedDate.text, '').trim();

  // Clean up any remaining connectors or punctuation
  reminderText = reminderText.replace(/\s+(at|on|by|in|for)\s*$/i, '').trim();
  reminderText = reminderText.replace(/[.,;:]$/g, '').trim();

  // Check if the reminder text is now empty after all the cleaning
  if (!reminderText || reminderText.length < 2) {
    // Try to extract a reasonable task from the original message
    const messageParts = message.split(/\s+/);
    // Use the first few words if the message is long enough
    if (messageParts.length >= 3) {
      reminderText = messageParts.slice(0, Math.min(3, messageParts.length)).join(' ');
    } else {
      reminderText = "Your reminder";  // Default fallback
    }
  }

  console.log('Extracted reminder text:', reminderText);
  console.log('Extracted date/time:', parsedDate.text);
  console.log('Parsed reminder time:', reminderTime);

  return {
    text: reminderText,
    time: reminderTime
  };
};

// Set up bot commands
const setupBot = () => {
  // Welcome command
  bot.start((ctx) => {
    ctx.reply('Welcome to the Reminder Bot! 🔔\n\nYou can create reminders by simply sending a message with a task and a time. For example:\n\n• Submit assignment tomorrow at 9am\n• Doctor appointment on Friday at 2:30pm\n• Call John in 2 hours\n• Pay bills by Friday');
  });

  // Help command
  bot.help((ctx) => {
    ctx.reply('How to use the Reminder Bot:\n\nJust send a message with what you want to be reminded about and when. For example:\n\n• Submit assignment tomorrow at 9am\n• Doctor appointment on Friday at 2:30pm\n• Call John in 2 hours\n• Pay bills by Friday');
  });

  // Handle messages
  bot.on('text', async (ctx) => {
    try {
      const { text } = ctx.message;
      const userId = `telegram:${ctx.from.id}`;
      
      // Parse the message
      const reminderData = parseReminderMessage(text);

      if (!reminderData) {
        return ctx.reply("I couldn't find a time in your message. Examples of what you can say:\n\n" +
          "• Submit assignment tomorrow at 9am\n" +
          "• Doctor appointment on Friday at 2:30pm\n" +
          "• Call John in 2 hours\n" +
          "• Pay bills by Friday");
      }

      // Create a new reminder
      const reminder = new Reminder({
        userId,
        text: reminderData.text,
        reminderTime: reminderData.time
      });

      await reminder.save();
      console.log('Reminder saved to database:', reminder);

      // Send confirmation
      ctx.reply(`✅ I'll remind you to ${reminderData.text} on ${reminderData.time.toLocaleString([], {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })}`);
    } catch (error) {
      console.error('Error processing message:', error);
      ctx.reply('Sorry, I encountered an error while processing your reminder. Please try again.');
    }
  });

  return bot;
};

// Send reminder via Telegram
const sendReminder = async (reminder) => {
  try {
    if (reminder.userId.startsWith('telegram:')) {
      const chatId = reminder.userId.replace('telegram:', '');
      await bot.telegram.sendMessage(chatId, `⏰ REMINDER: ${reminder.text}`);
      
      // Mark reminder as completed
      reminder.isCompleted = true;
      await reminder.save();
      
      console.log(`Telegram reminder sent to ${chatId} at ${new Date()}`);
    }
  } catch (error) {
    console.error('Error sending Telegram reminder:', error);
  }
};

// Launch the bot
const launchBot = () => {
  bot.launch()
    .then(() => {
      console.log('Telegram bot started successfully');
    })
    .catch((error) => {
      console.error('Error starting Telegram bot:', error);
    });
};

module.exports = {
  setupBot,
  launchBot,
  sendReminder
}; 