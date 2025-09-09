import axios from 'axios';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const { menfess } = req.body;

  if (!menfess) {
    return res.status(400).json({ success: false, message: 'Isi menfess tidak boleh kosong.' });
  }

  try {
    const orderId = `menfess-${Date.now()}`;
    const grossAmount = 5000;

    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY
    );

    // --- Langkah 1: Simpan menfess ke database Supabase ---
    const { data, error: insertError } = await supabase
      .from('menfess_posts')
      .insert([
        { order_id: orderId, content: menfess, status: 'PENDING' }
      ]);

    if (insertError) {
      throw insertError;
    }

    // --- Langkah 2: Buat QRIS di Midtrans ---
    const midtransResponse = await axios.post(
      'https://api.sandbox.midtrans.com/v2/charge',
      {
        payment_type: 'qris',
        transaction_details: {
          order_id: orderId,
          gross_amount: grossAmount,
        },
        qris: {
          acquirer_id: process.env.GOPAY_PARTNER_ID,
        }
      },
      {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': `Basic ${Buffer.from(process.env.GOPAY_APP_SECRET + ':').toString('base64')}`,
        },
      }
    );

    const qrisUrl = midtransResponse.data.actions.find(action => action.name === 'generate-qr-code').url;

    res.status(200).json({
      success: true,
      qris_url: qrisUrl,
      order_id: orderId,
      message: 'QRIS berhasil dibuat, silakan lakukan pembayaran.'
    });

  } catch (error) {
    console.error('Error creating QRIS:', error.message);
    res.status(500).json({ success: false, message: 'Gagal membuat QRIS.' });
  }
}
