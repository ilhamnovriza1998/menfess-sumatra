import axios from 'axios';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const { transaction_status, order_id } = req.body;

  // VERIFIKASI TANDA TANGAN DARI GOPAY (PENTING!)
  const signatureKey = process.env.GOPAY_ORDER_RELAY_SECRET;
  const signature = req.headers['x-gopay-signature'];
  const bodyString = JSON.stringify(req.body);

  const hmac = crypto.createHmac('sha256', signatureKey).update(bodyString).digest('hex');

  if (hmac !== signature) {
    console.error('Tanda tangan webhook tidak valid.');
    return res.status(403).json({ message: 'Unauthorized Request' });
  }

  // --- LOGIKA UTAMA ---
  if (transaction_status === 'settlement' || transaction_status === 'capture') {
    console.log(`Pembayaran untuk Order ID ${order_id} berhasil.`);

    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY
    );

    try {
      // --- Langkah 1: Ambil data menfess dari Supabase ---
      const { data: menfessData, error: fetchError } = await supabase
        .from('menfess_posts')
        .select('content')
        .eq('order_id', order_id)
        .single();

      if (fetchError) {
        throw fetchError;
      }
      
      const menfessContent = menfessData.content;

      // --- Langkah 2: Update status menfess menjadi 'POSTED' ---
      const { error: updateError } = await supabase
        .from('menfess_posts')
        .update({ status: 'POSTED' })
        .eq('order_id', order_id);

      if (updateError) {
        throw updateError;
      }

      // --- Langkah 3: Post menfess ke Twitter (X) ---
      const twitterPostUrl = 'https://api.twitter.com/2/tweets';
      const twitterBearerToken = process.env.TWITTER_BEARER_TOKEN;
      
      await axios.post(twitterPostUrl, { text: menfessContent }, {
        headers: {
          'Authorization': `Bearer ${twitterBearerToken}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('Menfess berhasil diposting ke Twitter.');
      res.status(200).json({ message: 'Pembayaran berhasil dan menfess sudah diposting.' });

    } catch (error) {
      console.error('Gagal memproses webhook:', error.message);
      res.status(500).json({ message: 'Gagal memproses menfess.' });
    }
  } else {
    res.status(200).json({ message: 'Status pembayaran tidak memerlukan aksi.' });
  }
}
