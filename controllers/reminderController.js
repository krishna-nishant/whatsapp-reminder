const Reminder = require('../models/Reminder');
const twilio = require('twilio');
const chrono = require('chrono-node');
const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

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
  console.log('Parsed reminder time (local):', reminderTime.toLocaleString());
  console.log('Parsed reminder time (UTC):', reminderTime.toISOString());

  return {
    text: reminderText,
    time: reminderTime
  };
};

// Process incoming WhatsApp message
const processMessage = async (req, res) => {
  try {
    console.log('Received message webhook:', req.body);

    const { Body, From } = req.body;

    console.log('Message body:', Body);
    console.log('From:', From);

    // Extract the WhatsApp number without the prefix
    const userId = From;

    // Parse the message
    const reminderData = parseReminderMessage(Body);

    if (!reminderData) {
      // Send error response
      console.log('Sending error response - could not parse message');
      const twiml = new twilio.twiml.MessagingResponse();
      twiml.message("I couldn't find a time in your message. Examples of what you can say:\n\n" +
        "• Submit assignment tomorrow at 9am\n" +
        "• Doctor appointment on Friday at 2:30pm\n" +
        "• Call John in 2 hours\n" +
        "• Pay bills by Friday");

      const responseXml = twiml.toString();
      console.log('Response XML:', responseXml);

      res.writeHead(200, { 'Content-Type': 'text/xml' });
      return res.end(responseXml);
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
    const twiml = new twilio.twiml.MessagingResponse();
    twiml.message(`✅ I'll remind you to ${reminderData.text} on ${reminderData.time.toLocaleString([], {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })}`);

    const responseXml = twiml.toString();
    console.log('Response XML:', responseXml);

    res.writeHead(200, { 'Content-Type': 'text/xml' });
    return res.end(responseXml);

  } catch (error) {
    console.error('Error processing message:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Send reminder via WhatsApp
const sendReminder = async (reminder) => {
  try {
    await client.messages.create({
      body: `⏰ REMINDER: ${reminder.text}`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: reminder.userId
    });

    // Mark reminder as completed
    reminder.isCompleted = true;
    await reminder.save();

    console.log(`Reminder sent to ${reminder.userId} at ${new Date()}`);
  } catch (error) {
    console.error('Error sending reminder:', error);
  }
};

// Check for due reminders - called by cron job
const checkReminders = async () => {
  try {
    const now = new Date();
    console.log('Checking for reminders at:', now);
    console.log('Current time (local):', now.toLocaleString());
    console.log('Current time (UTC):', now.toISOString());

    // Find reminders that are due but not yet completed
    const dueReminders = await Reminder.find({
      reminderTime: { $lte: now },
      isCompleted: false
    });

    console.log(`Found ${dueReminders.length} due reminders`);

    // Log each due reminder for debugging
    dueReminders.forEach(reminder => {
      console.log(`Due reminder: "${reminder.text}" - Time: ${reminder.reminderTime}, User: ${reminder.userId}`);
    });

    // Send each due reminder
    for (const reminder of dueReminders) {
      // Check if it's a WhatsApp or Telegram reminder
      if (reminder.userId.startsWith('telegram:')) {
        // Telegram reminders will be handled by telegramController
        // This will be imported and used in server.js
        console.log('Skipping Telegram reminder in reminderController');
      } else {
        // Assume WhatsApp reminder
        await sendReminder(reminder);
      }
    }
  } catch (error) {
    console.error('Error checking reminders:', error);
  }
};

module.exports = {
  processMessage,
  checkReminders
}; 