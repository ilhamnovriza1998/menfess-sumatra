// api/send-to-telegram.js
const { Telegraf } = require('telegraf');

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    console.log('🔧 Starting Telegram API...');
    
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const channelTarget = process.env.TELEGRAM_CHANNEL;
    
    console.log('Env Check - Token:', !!botToken, 'Channel:', channelTarget);

    if (!botToken) {
      throw new Error('TELEGRAM_BOT_TOKEN not found in environment variables');
    }
    
    if (!channelTarget) {
      throw new Error('TELEGRAM_CHANNEL not found in environment variables');
    }

    const bot = new Telegraf(botToken);
    
    // Untuk Vercel, kita terima JSON saja dulu (simplified)
    const { text, type, imageUrl } = req.body;

    console.log('Received data:', { text, type, imageUrl });

    if (!text) {
      return res.status(400).json({ success: false, error: 'Text is required' });
    }

    if (type === 'photo' && imageUrl) {
      // Kirim foto dari URL (simplified dulu)
      await bot.telegram.sendPhoto(channelTarget, imageUrl, {
        caption: text,
        parse_mode: 'HTML'
      });
    } else {
      // Kirim teks saja
      await bot.telegram.sendMessage(channelTarget, text, {
        parse_mode: 'HTML'
      });
    }

    console.log('✅ Message sent successfully to Telegram');
    
    res.status(200).json({ 
      success: true, 
      message: 'Menfess berhasil dikirim ke Telegram!' 
    });

  } catch (error) {
    console.error('❌ Telegram API Error:', error);
    
    // Error handling yang lebih detail
    let errorMessage = 'Gagal mengirim ke Telegram';
    let errorDetails = '';

    if (error.response) {
      errorDetails = error.response.description || `Error ${error.response.error_code}`;
    } else if (error.code) {
      errorDetails = `Code: ${error.code}`;
    } else {
      errorDetails = error.message;
    }

    console.error('Error details:', errorDetails);

    res.status(500).json({ 
      success: false, 
      error: `${errorMessage}: ${errorDetails}`,
      debug: {
        hasToken: !!process.env.TELEGRAM_BOT_TOKEN,
        hasChannel: !!process.env.TELEGRAM_CHANNEL,
        channel: process.env.TELEGRAM_CHANNEL
      }
    });
  }
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '4mb',
    },
  },
};
