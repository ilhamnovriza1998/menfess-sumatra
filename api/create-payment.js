import crypto from 'crypto';
import axios from 'axios';
import { HttpsProxyAgent } from 'https-proxy-agent';

export default async function handler(req, res) {
  // 1. Hanya izinkan method POST
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false, 
      error: 'Method tidak diizinkan' 
    });
  }

  try {
    // 2. Ambil 'text' dari body request (dikirim dari frontend)
    // Gunakan destructuring dan set default string kosong jika tidak ada
    const { text = "" } = req.body;

    // Validasi sederhana
    if (!text || text.trim() === "") {
      return res.status(400).json({
        success: false,
        error: 'Pesan menfess tidak boleh kosong.'
      });
    }

    // 3. Pastikan semua Environment Variables ada
    const mCode = process.env.TRIPAY_MERCHANT_CODE?.trim();
    const pKey = process.env.TRIPAY_PRIVATE_KEY?.trim();
    const apiKey = process.env.TRIPAY_API_KEY?.trim();
    const fixieUrl = process.env.FIXIE_URL || process.env.PROXY_URL;

    if (!mCode || !pKey || !apiKey) {
      throw new Error('Konfigurasi API Tripay belum lengkap di Environment Variables');
    }

    const merchantRef = 'MENFESS-' + Date.now();
    const amount = 1000; // Sesuaikan nominal

    // 4. Generate Signature
    const signature = crypto
      .createHmac('sha256', pKey)
      .update(mCode + merchantRef + amount)
      .digest('hex');

    // 5. Susun Payload
    const payload = {
      method: 'QRIS',
      merchant_ref: merchantRef,
      amount: amount,
      // Titipkan isi pesan menfess di customer_name agar bisa diambil di callback.js
      customer_name: text.substring(0, 255), 
      customer_email: 'anon@menfess.com',
      order_items: [
        {
          sku: 'MENFESS01',
          name: 'Kirim Menfess',
          price: amount,
          quantity: 1
        }
      ],
      callback_url: 'https://menfess-sumatra.vercel.app/api/callback',
      return_url: 'https://menfess-sumatra.vercel.app',
      expired_time: Math.floor(Date.now() / 1000) + (15 * 60),
      signature: signature
    };

    // 6. Inisialisasi Proxy Agent (Fixie)
    const agent = fixieUrl ? new HttpsProxyAgent(fixieUrl) : null;

    // 7. Request ke Tripay
    const tripayResponse = await axios.post(
      'https://tripay.co.id/api/transaction/create',
      payload,
      {
        httpsAgent: agent,
        proxy: false, // Penting agar tidak konflik dengan internal axios
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000 
      }
    );

    // 8. Berikan respon balik ke frontend (Berisi data QRIS)
    return res.status(200).json({
      success: true,
      data: tripayResponse.data.data
    });

  } catch (error) {
    // Log detail error di dashboard Vercel
    console.error("Tripay Error Detail:", error.response?.data || error.message);

    return res.status(500).json({
      success: false,
      message: 'Gagal memproses pembayaran',
      error: error.response?.data || error.message
    });
  }
}