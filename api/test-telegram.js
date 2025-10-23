// File: api/test-telegram.js (buat untuk testing)
const { Telegraf } = require('telegraf');

module.exports = async (req, res) => {
  try {
    const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);
    
    // Test kirim pesan sederhana
    await bot.telegram.sendMessage(
      process.env.TELEGRAM_CHANNEL,
      '🔧 TEST: Bot berhasil terhubung!',
      { parse_mode: 'HTML' }
    );

    res.status(200).json({ 
      success: true, 
      message: 'Test berhasil! Bot terhubung ke Telegram.' 
    });
  } catch (error) {
    console.error('Error test:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      details: error.response || 'No response details'
    });
  }
};
