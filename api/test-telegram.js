// api/test.js
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    return res.status(200).json({ 
      success: true, 
      message: 'API is working!',
      env: {
        hasToken: !!process.env.TELEGRAM_BOT_TOKEN,
        hasChannel: !!process.env.TELEGRAM_CHANNEL,
        channel: process.env.TELEGRAM_CHANNEL
      }
    });
  }

  if (req.method === 'POST') {
    try {
      const { message } = req.body;
      
      return res.status(200).json({ 
        success: true, 
        received: message,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      return res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' });
}
