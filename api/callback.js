import crypto from 'crypto';
import { Telegraf } from 'telegraf';

export default async function handler(req, res) {
  // Tripay mengirim callback dengan method POST
  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  const callbackSignature = req.headers['x-callback-signature'];
  const jsonPayload = JSON.stringify(req.body);

  // 1. Verifikasi Signature agar aman dari hacker
  const privateKey = process.env.TRIPAY_PRIVATE_KEY.trim();
  const signature = crypto
    .createHmac('sha256', privateKey)
    .update(jsonPayload)
    .digest('hex');

  if (signature !== callbackSignature) {
    return res.status(403).json({ success: false, message: 'Invalid Signature' });
  }

  // 2. Ambil data dari Tripay
  // Kita ambil 'customer_name' karena di step sebelumnya kita titipkan teks menfess di sana
  const { status, customer_name, merchant_ref } = req.body;

  // 3. Eksekusi hanya jika statusnya PAID (Lunas)
  if (status === 'PAID') {
    try {
      const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);
      const channelTarget = process.env.TELEGRAM_CHANNEL;

      const message = `📩 **Menfess Baru Berhasil Terbayar!**\n\n` +
                      `Pesan:\n"${customer_name}"\n\n` +
                      `#Ref: ${merchant_ref}`;

      await bot.telegram.sendMessage(channelTarget, message, {
        parse_mode: "HTML",
      });

      console.log(`✅ Menfess ${merchant_ref} terkirim ke Telegram.`);
      
      // Tripay butuh respon JSON success agar tidak mengirim ulang callback
      return res.status(200).json({ success: true });

    } catch (error) {
      console.error("Gagal kirim Telegram di Callback:", error);
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  // Respon jika status belum PAID (misal: EXPIRED)
  return res.status(200).json({ success: true });
}