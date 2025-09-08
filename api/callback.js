// Import library yang dibutuhkan
import axios from 'axios';
import crypto from 'crypto';

// Ini adalah mock database. Anda harus menggantinya dengan database asli
// seperti PlanetScale, Supabase, atau MongoDB Atlas.
// Fungsi ini harus mengambil data menfess berdasarkan order_id.
// async function getMenfessFromDB(orderId) {
//   // Logika untuk mengambil data dari database
//   // return { text: 'Isi menfess dari database', mediaId: 'optional_media_id' };
// }

export default async function handler(req, res) {
  // Hanya proses permintaan POST dari GoPay
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const { transaction_status, order_id } = req.body;

  // VERIFIKASI TANDA TANGAN DARI GOPAY (SANGAT PENTING!)
  // Ini untuk memastikan permintaan benar-benar datang dari GoPay
  const signatureKey = process.env.GOPAY_ORDER_RELAY_SECRET;
  const signature = req.headers['x-gopay-signature'];
  const bodyString = JSON.stringify(req.body);

  const hmac = crypto.createHmac('sha256', signatureKey).update(bodyString).digest('hex');

  if (hmac !== signature) {
    // Jika tanda tangan tidak cocok, tolak permintaan
    console.error('Tanda tangan webhook tidak valid.');
    return res.status(403).json({ message: 'Unauthorized Request' });
  }

  // --- LOGIKA UTAMA: PROSES PEMBAYARAN BERHASIL ---
  if (transaction_status === 'settlement' || transaction_status === 'capture') {
    console.log(`Pembayaran untuk Order ID ${order_id} berhasil.`);

    try {
      // 1. Ambil data menfess dari database
      // const menfessData = await getMenfessFromDB(order_id);

      // Ini adalah contoh placeholder jika Anda belum punya database.
      // Di sini Anda harusnya mengambil data asli dari database
      const menfessData = {
        text: 'Ini adalah menfess otomatis dari backend saya! Pembayaran berhasil dan menfess ini berhasil diposting. ✨',
        mediaId: null // Ganti dengan ID media jika ada gambar
      };

      // 2. Post menfess ke Twitter (X)
      const twitterPostUrl = 'https://api.twitter.com/2/tweets';
      const twitterBearerToken = process.env.TWITTER_BEARER_TOKEN;
      
      const tweetPayload = { text: menfessData.text };
      if (menfessData.mediaId) {
        tweetPayload.media = { media_ids: [menfessData.mediaId] };
      }
      
      await axios.post(twitterPostUrl, tweetPayload, {
        headers: {
          'Authorization': `Bearer ${twitterBearerToken}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('Menfess berhasil diposting ke Twitter.');
      res.status(200).json({ message: 'Pembayaran berhasil dan menfess sudah diposting.' });

    } catch (error) {
      console.error('Gagal memposting ke Twitter:', error.response ? error.response.data : error.message);
      res.status(500).json({ message: 'Gagal memposting menfess.' });
    }

  } else {
    // Jika status pembayaran bukan "settlement" atau "capture", abaikan
    res.status(200).json({ message: 'Status pembayaran tidak memerlukan aksi.' });
  }
}
