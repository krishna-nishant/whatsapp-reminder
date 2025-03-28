const ngrok = require('ngrok');

async function startNgrok() {
  try {
    const url = await ngrok.connect({
      addr: 3000,
      onStatusChange: status => {
        console.log('Ngrok Status:', status);
      },
      onLogEvent: data => {
        console.log('Ngrok Log:', data);
      }
    });
    
    console.log('='.repeat(50));
    console.log('Ngrok tunnel started at:', url);
    console.log('Webhook URL for Twilio WhatsApp Sandbox:', `${url}/webhook`);
    console.log('='.repeat(50));
    
    console.log('Press Ctrl+C to close the tunnel');
  } catch (error) {
    console.error('Error starting ngrok:', error);
  }
}

startNgrok(); 