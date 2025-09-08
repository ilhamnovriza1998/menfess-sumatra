// Import library yang dibutuhkan
import axios from 'axios';

// Anda akan membutuhkan library untuk terhubung ke database.
// Contoh di bawah ini menggunakan placeholder. Anda harus
// menggantinya dengan library database yang Anda pilih (mis. PlanetScale).
// import { saveMenfessToDB } from './database-client';

export default async function handler(req, res) {
  // Hanya proses permintaan POST
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const { menfess, gambar } = req.body; // Terima menfess dan URL gambar (jika ada)

  if (!menfess) {
    return res.status(400).json({ success: false, message: 'Isi menfess tidak boleh kosong.' });
  }

  try {
    const orderId = `menfess-${Date.now()}`;
    const grossAmount = 5000; // Harga menfess, bisa diubah

    // Panggil API GoPay (Midtrans) untuk membuat QRIS
    const midtransResponse = await axios.post(
      'https://api.sandbox.midtrans.com/v2/charge', // Endpoint untuk membuat QRIS
      {
        payment_type: 'qris',
        transaction_details: {
          order_id: orderId,
          gross_amount: grossAmount,
        },
        qris: {
          // Ganti dengan ID partner GoPay Anda
          // Pastikan ID ini sudah didaftarkan di dashboard Midtrans
          acquirer_id: process.env.GOPAY_PARTNER_ID,
        }
      },
      {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          // Gunakan server key Anda untuk otentikasi
          'Authorization': `Basic ${Buffer.from(process.env.GOPAY_APP_SECRET + ':').toString('base64')}`,
        },
      }
    );

    // Ambil URL QRIS dari respons Midtrans
    const qrisUrl = midtransResponse.data.actions.find(action => action.name === 'generate-qr-code').url;

    // --- Simpan menfess ke database ---
    // Di sini Anda harus menyimpan data menfess, gambar (jika ada),
    // dan orderId ke database. Status awal harus PENDING.
    // Contoh:
    // await saveMenfessToDB(orderId, menfess, gambar, 'PENDING');

    res.status(200).json({
      success: true,
      qris_url: qrisUrl,
      order_id: orderId,
      message: 'QRIS berhasil dibuat, silakan lakukan pembayaran.'
    });

  } catch (error) {
    console.error('Error creating QRIS:', error.response ? error.response.data : error.message);
    res.status(500).json({ success: false, message: 'Gagal membuat QRIS.' });
  }
}
