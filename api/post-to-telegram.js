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
    
    console.log('Environment:', {
      tokenLength: botToken ? botToken.length : 0,
      channel: channelTarget,
      channelType: typeof channelTarget
    });

    if (!botToken) {
      throw new Error('TELEGRAM_BOT_TOKEN not found');
    }
    
    if (!channelTarget) {
      throw new Error('TELEGRAM_CHANNEL not found');
    }

    const bot = new Telegraf(botToken);
    
    // Parse JSON body
    const { text, type } = req.body;

    console.log('📨 Received request:', { 
      text: text ? text.substring(0, 100) + '...' : 'empty',
      type: type,
      bodyKeys: Object.keys(req.body)
    });

    if (!text || text.trim() === '') {
      return res.status(400).json({ 
        success: false, 
        error: 'Text is required and cannot be empty' 
      });
    }

    console.log('📤 Sending to Telegram...');
    console.log('Channel:', channelTarget);
    console.log('Message length:', text.length);

    // Test dengan method yang berbeda
    let result;
    
    if (type === 'photo') {
      // Untuk foto, kita kirim teks dulu (simplified)
      console.log('🖼️ Photo type detected, sending as text for now...');
      result = await bot.telegram.sendMessage(channelTarget, text + '\n\n[Foto akan dikirim terpisah]', {
        parse_mode: 'HTML'
      });
    } else {
      // Kirim teks biasa
      result = await bot.telegram.sendMessage(channelTarget, text, {
        parse_mode: 'HTML'
      });
    }

    console.log('✅ Telegram API Response:', {
      messageId: result.message_id,
      date: result.date,
      chat: result.chat
    });

    res.status(200).json({ 
      success: true, 
      message: 'Menfess berhasil dikirim ke Telegram!',
      messageId: result.message_id
    });

  } catch (error) {
    console.error('❌ Telegram API Error Details:');
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error code:', error.code);
    console.error('Error response:', error.response);
    
    if (error.response) {
      console.error('Telegram API Error:', {
        errorCode: error.response.error_code,
        description: error.response.description,
        parameters: error.response.parameters
      });
    }

    let userMessage = 'Gagal mengirim ke Telegram';
    let debugInfo = {};

    if (error.response) {
      switch (error.response.error_code) {
        case 400:
          userMessage = 'Bad Request: Pastikan channel username benar';
          break;
        case 403:
          userMessage = 'Bot tidak memiliki akses ke channel. Pastikan bot sudah jadi admin di channel @menfesssumatra';
          break;
        case 404:
          userMessage = 'Channel tidak ditemukan. Pastikan username @menfesssumatra benar';
          break;
        default:
          userMessage = `Telegram Error: ${error.response.description}`;
      }
      debugInfo.telegramError = error.response.description;
    } else if (error.code === 'ETELEGRAM') {
      userMessage = 'Error koneksi ke Telegram';
    } else {
      userMessage = error.message;
    }

    res.status(500).json({ 
      success: false, 
      error: userMessage,
      debug: debugInfo
    });
  }
                }
