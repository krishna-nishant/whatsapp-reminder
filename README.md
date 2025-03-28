# WhatsApp Reminder Bot

A simple bot that lets users set reminders via WhatsApp. The bot will send a WhatsApp message back to the user at the scheduled time.

## Features

- Receive WhatsApp messages and extract reminder text & time
- Store reminders in MongoDB
- Send WhatsApp message reminders at the scheduled time
- Simple natural language processing to understand common time formats

## Prerequisites

- Node.js
- MongoDB
- Twilio Account with WhatsApp API access

## Setup

1. Clone the repository:
   ```
   git clone <repository-url>
   cd whatsapp-reminder-bot
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Create a `.env` file in the root directory with the following variables:
   ```
   PORT=3000
   MONGODB_URI=mongodb://localhost:27017/reminder-bot
   TWILIO_ACCOUNT_SID=your_twilio_account_sid
   TWILIO_AUTH_TOKEN=your_twilio_auth_token
   TWILIO_PHONE_NUMBER=whatsapp:+14155238886  # Your Twilio WhatsApp number
   ```

4. Set up Twilio WhatsApp Sandbox:
   - Go to the [Twilio Console](https://www.twilio.com/console)
   - Navigate to Messaging > Try it > Send a WhatsApp message
   - Follow the instructions to set up the WhatsApp Sandbox
   - Set the webhook URL to `https://your-server-url.com/api/webhook`

## Running the Application

Development mode:
```
npm run dev
```

Production mode:
```
npm start
```

## Usage

1. Send a WhatsApp message to your Twilio WhatsApp number in the format:
   ```
   Remind me to [task] at [time]
   ```

   Examples:
   - "Remind me to submit my resume at 10 PM"
   - "Remind me to call mom at 9:30 am"
   - "Remind me to take medicine at 2:45 pm tomorrow"

2. The bot will respond with a confirmation message
3. At the scheduled time, the bot will send you a reminder message

## Deployment

To deploy the application to a production environment:

1. Set up a MongoDB database (you can use MongoDB Atlas)
2. Deploy the Node.js application to a hosting service like Heroku, AWS, or DigitalOcean
3. Set up environment variables on your hosting service
4. Make sure your webhook URL is accessible from the internet
5. Update your Twilio WhatsApp webhook URL to point to your deployed application

## License

ISC 