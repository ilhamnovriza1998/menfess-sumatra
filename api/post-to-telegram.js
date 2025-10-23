// api/send-to-telegram.js
import { Telegraf } from 'telegraf';

// ✅ aktifkan parser body JSON agar req.body terbaca di Vercel
export const config = {
  api: {
    bodyParser: true,
  },
};

export default async function handler(req, res) {
  // Izinkan CORS agar bisa diakses dari frontend
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  // Hanya izinkan POST
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const channelTarget = process.env.TELEGRAM_CHANNEL;

    if (!botToken || !channelTarget) {
      throw new Error('Environment variable TELEGRAM_BOT_TOKEN atau TELEGRAM_CHANNEL belum diatur');
    }

    const bot = new Telegraf(botToken);
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { text, type, photoUrl } = body;

    if (!text || text.trim() === '') {
      return res.status(400).json({ success: false, error: 'Teks tidak boleh kosong' });
    }

    let result;
    if (type === 'photo' && photoUrl) {
      // kirim foto + caption
      result = await bot.telegram.sendPhoto(channelTarget, photoUrl, {
        caption: text,
        parse_mode: 'HTML',
      });
    } else {
      // kirim teks biasa
      result = await bot.telegram.sendMessage(channelTarget, text, {
        parse_mode: 'HTML',
      });
    }

    return res.status(200).json({
      success: true,
      message: '✅ Menfess berhasil dikirim ke Telegram!',
      messageId: result.message_id,
    });

  } catch (error) {
    console.error('❌ Error Telegram:', error.message);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}
