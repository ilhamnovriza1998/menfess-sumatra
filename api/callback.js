import crypto from 'crypto';
import { Telegraf } from 'telegraf';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  const callbackSignature = req.headers['x-callback-signature'];
  const jsonPayload = JSON.stringify(req.body);

  const signature = crypto.createHmac('sha256', process.env.TRIPAY_PRIVATE_KEY.trim())
    .update(jsonPayload)
    .digest('hex');

  if (signature !== callbackSignature) return res.status(403).send('Invalid Signature');

  const { status, customer_name, merchant_ref } = req.body;

  if (status === 'PAID') {
    try {
      const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);
      const channelId = process.env.TELEGRAM_CHANNEL;
      const message = `📩 **MENFESS BARU!**\n\n${customer_name}\n\n#Ref: ${merchant_ref}`;

      await bot.telegram.sendMessage(channelId, message, { parse_mode: "HTML" });
      return res.status(200).json({ success: true });
    } catch (err) {
      return res.status(500).json({ success: false });
    }
  }
  return res.status(200).json({ success: true });
}