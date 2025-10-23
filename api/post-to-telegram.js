// api/send-to-telegram.js
const { Telegraf } = require('telegraf');

module.exports = async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  // Handle OPTIONS request
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);
    const channelId = process.env.TELEGRAM_CHANNEL_ID;

    const { text, type } = req.body;
    let imageFile = null;

    // Handle file upload jika ada
    if (type === 'photo' && req.files && req.files.image) {
      imageFile = req.files.image;
    }

    if (type === 'photo' && imageFile) {
      // Kirim foto dengan caption
      await bot.telegram.sendPhoto(channelId, 
        { source: imageFile.data },
        { caption: text }
      );
    } else {
      // Kirim teks saja
      await bot.telegram.sendMessage(channelId, text);
    }

    res.status(200).json({ 
      success: true, 
      message: 'Menfess berhasil dikirim ke Telegram' 
    });
  } catch (error) {
    console.error('Error sending to Telegram:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Gagal mengirim ke Telegram: ' + error.message 
    });
  }
};
