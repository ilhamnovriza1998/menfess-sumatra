import { Telegraf } from 'telegraf';
import { supabase } from '../lib/supabase.js';
import { verifyTripayCallback } from '../lib/payment.js';
import { buildTelegramCaption } from '../lib/menfess.js';
import {
  formatCaption,
  sendTelegramPhoto,
  sendTelegramMessage
} from '../lib/telegram.js';

async function postTransactionToTelegram(transaction, merchantRef) {
  const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);
  const channelId = process.env.TELEGRAM_CHANNEL;
  const caption = formatCaption(
    buildTelegramCaption(transaction.pesan, merchantRef, transaction.base)
  );

  if (transaction.foto_url) {
    return await sendTelegramPhoto(
      bot,
      channelId,
      transaction.foto_url,
      caption
    );
  }

  return await sendTelegramMessage(
    bot,
    channelId,
    caption
  );
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  try {
    const callbackSignature = req.headers['x-callback-signature'];

    if (!verifyTripayCallback(req.body, callbackSignature)) {
      return res.status(403).send('Invalid Signature');
    }

    const { status, merchant_ref: merchantRef } = req.body;

    if (!merchantRef) {
      return res.status(400).json({
        success: false,
        error: 'merchant_ref kosong'
      });
    }

    if (status !== 'PAID') {
      await supabase
        .from('transactions')
        .update({ status })
        .eq('merchant_ref', merchantRef);

      return res.status(200).json({ success: true });
    }

    const { data: transaction, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('merchant_ref', merchantRef)
      .single();

    if (error || !transaction) {
      throw new Error('Transaksi tidak ditemukan');
    }

    if (transaction.status === 'PAID_POSTED') {
      return res.status(200).json({
        success: true,
        message: 'Sudah pernah dipost'
      });
    }

    await postTransactionToTelegram(transaction, merchantRef);

    await supabase
      .from('transactions')
      .update({ status: 'PAID_POSTED' })
      .eq('merchant_ref', merchantRef);

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error callback Tripay:', error);

    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
