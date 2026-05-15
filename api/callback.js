import { createClient } from '@supabase/supabase-js';
import { Telegraf } from 'telegraf';
import crypto from 'crypto';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  const callbackSignature = req.headers['x-callback-signature'];
  const jsonBody = JSON.stringify(req.body);
  const signature = crypto.createHmac('sha256', process.env.TRIPAY_PRIVATE_KEY.trim())
    .update(jsonBody).digest('hex');

  // Validasi agar hanya Tripay yang bisa akses file ini
  if (signature !== callbackSignature) return res.status(403).send('Invalid Signature');

  const { status, merchant_ref } = req.body;

  if (status === 'PAID') {
    // 1. Ambil data pesan & foto dari Supabase berdasarkan merchant_ref
    const { data, error } = await supabase
      .from('transactions')
      .select('pesan, foto_url, status')
      .eq('merchant_ref', merchant_ref)
      .single();

    // Pastikan data ada dan belum pernah di-posting (menghindari double post)
    if (data && data.status !== 'PAID_POSTED') {
      const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);
      const channelId = process.env.TELEGRAM_CHANNEL;
      const caption = `📩 **MENFESS BARU!**\n\n${data.pesan}\n\n#Ref: ${merchant_ref}`;

      try {
        // 2. Logika: Kirim Foto+Teks atau Teks Saja
        if (data.foto_url && data.foto_url.includes('http')) {
          await bot.telegram.sendPhoto(channelId, data.foto_url, {
            caption: caption,
            parse_mode: "HTML"
          });
        } else {
          await bot.telegram.sendMessage(channelId, caption, { parse_mode: "HTML" });
        }

        // 3. Update status di DB agar tidak terposting ulang jika callback terpanggil lagi
        await supabase.from('transactions').update({ status: 'PAID_POSTED' }).eq('merchant_ref', merchant_ref);
      } catch (err) {
        console.error("Gagal kirim ke Telegram:", err.message);
      }
    }
  }

  return res.status(200).json({ success: true });
}