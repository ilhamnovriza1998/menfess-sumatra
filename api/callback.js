import { createClient } from '@supabase/supabase-js';
import { Telegraf } from 'telegraf';
import crypto from 'crypto';

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Forbidden');

  const callbackSignature = req.headers['x-callback-signature'];
  const signature = crypto.createHmac('sha256', process.env.TRIPAY_PRIVATE_KEY.trim())
    .update(JSON.stringify(req.body)).digest('hex');

  if (signature !== callbackSignature) return res.status(403).send('Invalid Signature');

  const { status, merchant_ref } = req.body;

  if (status === 'PAID') {
    const { data } = await supabase
      .from('transactions')
      .select('pesan, foto_url, status')
      .eq('merchant_ref', merchant_ref)
      .single();

    if (data && data.status !== 'PAID_POSTED') {
      const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);
      const channelId = process.env.TELEGRAM_CHANNEL;
      const caption = `📩 **MENFESS BARU!**\n\n${data.pesan}\n\n#Ref: ${merchant_ref}`;

      try {
        if (data.foto_url && data.foto_url.includes('http')) {
          await bot.telegram.sendPhoto(channelId, data.foto_url, { caption, parse_mode: "HTML" });
        } else {
          await bot.telegram.sendMessage(channelId, caption, { parse_mode: "HTML" });
        }
        await supabase.from('transactions').update({ status: 'PAID_POSTED' }).eq('merchant_ref', merchant_ref);
      } catch (e) { console.error(e); }
    }
  }
  return res.status(200).json({ success: true });
}