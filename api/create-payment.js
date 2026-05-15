import crypto from 'crypto';
import axios from 'axios';
import { HttpsProxyAgent } from 'https-proxy-agent';

export default async function handler(req, res) {
  // Hanya izinkan method POST
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false, 
      error: 'Method tidak diizinkan' 
    });
  }

  try {
    // Pastikan semua Environment Variables ada
    const mCode = process.env.TRIPAY_MERCHANT_CODE?.trim();
    const pKey = process.env.TRIPAY_PRIVATE_KEY?.trim();
    const apiKey = process.env.TRIPAY_API_KEY?.trim();
    const fixieUrl = process.env.FIXIE_URL || process.env.PROXY_URL;

    if (!mCode || !pKey || !apiKey) {
      throw new Error('Konfigurasi API Tripay belum lengkap di Environment Variables');
    }

    const merchantRef = 'MENFESS-' + Date.now();
    const amount = 1000;

    // Generate Signature
    const signature = crypto
      .createHmac('sha256', pKey)
      .update(mCode + merchantRef + amount)
      .digest('hex');

    const payload = {
      method: 'QRIS',
      merchant_ref: merchantRef,
      amount: amount,
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

    // Inisialisasi Agent untuk Proxy Fixie
    // proxy: false wajib ada agar Axios tidak menggunakan logic internal yang bug di Node 18+
    const agent = fixieUrl ? new HttpsProxyAgent(fixieUrl) : null;

    const tripayResponse = await axios.post(
      'https://tripay.co.id/api/transaction/create',
      payload,
      {
        httpsAgent: agent,
        proxy: false, 
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        // Timeout agar fungsi tidak menggantung jika proxy lambat
        timeout: 10000 
      }
    );

    return res.status(200).json({
      success: true,
      data: tripayResponse.data.data
    });

  } catch (error) {
    // Log error lengkap di console Vercel untuk debugging
    console.error("Tripay Error Detail:", error.response?.data || error.message);

    return res.status(500).json({
      success: false,
      message: 'Gagal memproses pembayaran',
      error: error.response?.data || error.message
    });
  }
}