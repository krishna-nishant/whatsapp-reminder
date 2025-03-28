const Reminder = require('../models/Reminder');
const twilio = require('twilio');
const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

// Parse the message to extract reminder text and time
const parseReminderMessage = (message) => {
  console.log('Parsing message:', message);
  // Basic parsing: Expecting format like "Remind me to [task] at [time]"
  const regex = /remind me to (.*?) at (.*)/i;
  const match = message.match(regex);
  
  if (!match) {
    console.log('No match found for the regex pattern');
    return null;
  }
  
  const reminderText = match[1].trim();
  const timeString = match[2].trim();
  
  console.log('Extracted reminder text:', reminderText);
  console.log('Extracted time string:', timeString);
  
  // Parse time - simple implementation for common formats
  let reminderTime;
  
  // Handle "tomorrow at X" format
  if (timeString.toLowerCase().includes('tomorrow')) {
    reminderTime = new Date();
    reminderTime.setDate(reminderTime.getDate() + 1);
    
    // Extract time from "tomorrow at X:XX" format
    const timeMatch = timeString.match(/(\d{1,2}):?(\d{2})?\s*(am|pm)?/i);
    if (timeMatch) {
      let hours = parseInt(timeMatch[1]);
      const minutes = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
      const period = timeMatch[3] ? timeMatch[3].toLowerCase() : null;
      
      // Handle AM/PM - Very explicit handling
      if (period) {
        if (period === 'am') {
          if (hours === 12) {
            // 12 AM is midnight (0 hours)
            hours = 0;
          }
          // All other AM times remain unchanged
        } else if (period === 'pm') {
          if (hours !== 12) {
            // PM times (except 12 PM) add 12 hours
            hours += 12;
          }
          // 12 PM remains as 12
        }
      }
      
      console.log(`Converting ${timeMatch[1]}:${timeMatch[2] || '00'} ${period || ''} to ${hours}:${minutes} in 24-hour format`);
      
      reminderTime.setHours(hours, minutes, 0, 0);
    } else {
      // Default to 9 AM if no specific time
      reminderTime.setHours(9, 0, 0, 0);
    }
  } 
  // Handle "X:XX am/pm" format
  else {
    const timeMatch = timeString.match(/(\d{1,2}):?(\d{2})?\s*(am|pm)?/i);
    
    if (timeMatch) {
      reminderTime = new Date();
      let hours = parseInt(timeMatch[1]);
      const minutes = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
      const period = timeMatch[3] ? timeMatch[3].toLowerCase() : null;
      
      // Handle AM/PM - Very explicit handling
      if (period) {
        if (period === 'am') {
          if (hours === 12) {
            // 12 AM is midnight (0 hours)
            hours = 0;
          }
          // All other AM times remain unchanged
        } else if (period === 'pm') {
          if (hours !== 12) {
            // PM times (except 12 PM) add 12 hours
            hours += 12;
          }
          // 12 PM remains as 12
        }
      }
      
      console.log(`Converting ${timeMatch[1]}:${timeMatch[2] || '00'} ${period || ''} to ${hours}:${minutes} in 24-hour format`);
      
      reminderTime.setHours(hours, minutes, 0, 0);
      
      // If the time is earlier than current time, assume next day
      if (reminderTime < new Date()) {
        reminderTime.setDate(reminderTime.getDate() + 1);
      }
      
      // No need for timezone adjustment - just log local format
      console.log('Reminder time (local):', reminderTime.toLocaleString());
    } else {
      console.log('Could not parse the time format');
      return null; // Could not parse the time
    }
  }
  
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
      twiml.message("I couldn't understand your reminder format. Please use: 'Remind me to [task] at [time]'");
      
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
    twiml.message(`✅ I'll remind you to ${reminderData.text} at ${reminderData.time.toLocaleString([], { 
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
      await sendReminder(reminder);
    }
  } catch (error) {
    console.error('Error checking reminders:', error);
  }
};

module.exports = {
  processMessage,
  checkReminders
}; 