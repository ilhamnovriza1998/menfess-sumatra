import { normalizeMenfessType } from '../lib/menfess.js';
import { createPendingTransaction } from '../lib/transactions.js';
import { isEmptyText } from '../lib/utils.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const text = String(req.body?.text || '').trim();
    const fotoUrl = req.body?.foto_url || null;
    const base = String(req.body?.base || 'SUMATRA').trim();
    const type = normalizeMenfessType(req.body?.type || 'text', fotoUrl);

    if (type === 'text' && isEmptyText(text)) {
      return res.status(400).json({
        success: false,
        error: 'Teks menfess tidak boleh kosong.'
      });
    }

    if (type === 'photo' || fotoUrl) {
      return res.status(400).json({
        success: false,
        error: 'Upload foto melalui /api/post-to-telegram agar foto bisa di-watermark dan disimpan.'
      });
    }

    const { merchantRef, amount, payment } = await createPendingTransaction({
      req,
      pesan: text,
      type,
      fotoUrl,
      base
    });

    return res.status(200).json({
      success: true,
      merchant_ref: merchantRef,
      amount,
      data: payment.data
    });
  } catch (error) {
    console.error('Error create payment:', error.response?.data || error);

    return res.status(500).json({
      success: false,
      error: error.response?.data?.message || error.message
    });
  }
}
