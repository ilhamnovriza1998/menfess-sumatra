import { createClient } from '@supabase/supabase-js';
import { Telegraf } from 'telegraf';
import crypto from 'crypto';
import {
  formatCaption,
  sendTelegramPhoto,
  sendTelegramMessage
} from '../lib/telegram.js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

export default async function handler(req, res) {

  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  try {

    // ✅ Validasi signature Tripay
    const callbackSignature =
      req.headers['x-callback-signature'];

    const signature = crypto
      .createHmac(
        'sha256',
        process.env.TRIPAY_PRIVATE_KEY.trim()
      )
      .update(JSON.stringify(req.body))
      .digest('hex');

    if (signature !== callbackSignature) {
      return res.status(403).send('Invalid Signature');
    }

    const {
      status,
      merchant_ref
    } = req.body;

    // ✅ hanya proses jika PAID
    if (status === 'PAID') {

      // ambil data transaksi
      const { data, error } =
        await supabase
          .from('transactions')
          .select('*')
          .eq('merchant_ref', merchant_ref)
          .single();

      if (error || !data) {
        throw new Error('Transaksi tidak ditemukan');
      }

      // ✅ cegah double post
      if (data.status === 'PAID_POSTED') {
        return res.status(200).json({
          success: true,
          message: 'Sudah pernah dipost'
        });
      }

      const bot =
        new Telegraf(
          process.env.TELEGRAM_BOT_TOKEN
        );

      const channelId =
        process.env.TELEGRAM_CHANNEL;

      const caption =
`━━━〔 💌 ALTER BASE PKU 💌 〕━━━

${data.pesan}

#Ref: ${merchant_ref}`;

      // ✅ jika ada foto
      if (
        data.foto_url &&
        data.foto_url.includes('http')
      ) {

        await sendTelegramPhoto(
         bot,
         channelId,
         data.foto_url,
         formatCaption(caption)
        );

      } else {

        // ✅ text only
        await sendTelegramMessage(
         bot,
         channelId,
         formatCaption(caption)
        );

      }

      // ✅ update status
      await supabase
        .from('transactions')
        .update({
          status: 'PAID_POSTED'
        })
        .eq('merchant_ref', merchant_ref);

    }

    return res.status(200).json({
      success: true
    });

  } catch (error) {

    console.error(error);

    return res.status(500).json({
      success: false,
      error: error.message
    });

  }

}