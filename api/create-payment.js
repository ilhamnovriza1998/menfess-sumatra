import crypto from 'crypto';
import axios from 'axios';
import { HttpsProxyAgent } from 'https-proxy-agent'; // Tambahkan ini

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method tidak diizinkan' });
  }

  try {
    const merchantRef = 'MENFESS-' + Date.now();
    const amount = 5000;
    
    // 1. Pastikan variabel env bersih dari spasi (trim)
    const mCode = process.env.TRIPAY_MERCHANT_CODE.trim();
    const pKey = process.env.TRIPAY_PRIVATE_KEY.trim();
    const apiKey = process.env.TRIPAY_API_KEY.trim();

    // 2. Hitung Signature dengan data yang bersih
    const signature = crypto
      .createHmac('sha256', pKey)
      .update(mCode + merchantRef + amount)
      .digest('hex');

    const payload = {
      method: 'QRIS',
      merchant_ref: merchantRef,
      amount: amount,
      customer_name: 'Anonymous',
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

    // 3. Gunakan HttpsProxyAgent (Lebih stabil untuk Fixie di Vercel)
    // Pastikan variabel di Vercel namanya FIXIE_URL (sesuai integrasi otomatis tadi)
    const agent = new HttpsProxyAgent(process.env.FIXIE_URL || process.env.PROXY_URL);

    const tripayResponse = await axios.post(
      'https://tripay.co.id/api/transaction/create',
      payload,
      {
        httpsAgent: agent, // Pakai ini, bukan properti 'proxy'
        proxy: false,      // Matikan proxy bawaan axios agar tidak bentrok
        headers: {
          'Authorization': 'Bearer ' + apiKey,
          'Content-Type': 'application/json'
        }
      }
    );

    return res.status(200).json({
      success: true,
      data: tripayResponse.data.data
    });

  } catch (error) {
    console.error("Tripay Error Detail:", error.response?.data || error.message);

    return res.status(500).json({
      success: false,
      error: error.response?.data || error.message
    });
  }
}