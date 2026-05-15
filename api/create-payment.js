import crypto from 'crypto';
import axios from 'axios';
import { HttpsProxyAgent } from 'https-proxy-agent';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ success: false });

  try {
    const { text = "" } = req.body;
    if (!text.trim()) return res.status(400).json({ success: false, error: 'Teks kosong' });

    const mCode = process.env.TRIPAY_MERCHANT_CODE.trim();
    const pKey = process.env.TRIPAY_PRIVATE_KEY.trim();
    const apiKey = process.env.TRIPAY_API_KEY.trim();
    const fixieUrl = process.env.FIXIE_URL || process.env.PROXY_URL;

    const merchantRef = 'MENFESS-' + Date.now();
    const amount = 1000;

    const signature = crypto.createHmac('sha256', pKey)
      .update(mCode + merchantRef + amount)
      .digest('hex');

    const payload = {
      method: 'QRIS',
      merchant_ref: merchantRef,
      amount: amount,
      customer_name: text.substring(0, 255),
      customer_email: 'anon@menfess.com',
      order_items: [{ sku: 'MF01', name: 'Menfess', price: amount, quantity: 1 }],
      callback_url: 'https://menfess-sumatra.vercel.app/api/callback',
      return_url: 'https://menfess-sumatra.vercel.app',
      expired_time: Math.floor(Date.now() / 1000) + (15 * 60),
      signature: signature
    };

    const agent = fixieUrl ? new HttpsProxyAgent(fixieUrl) : null;

    const response = await axios.post('https://tripay.co.id/api/transaction/create', payload, {
      httpsAgent: agent,
      proxy: false,
      headers: { 'Authorization': `Bearer ${apiKey}` }
    });

    return res.status(200).json({ success: true, data: response.data.data });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
}