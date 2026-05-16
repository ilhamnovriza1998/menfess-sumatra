import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import axios from 'axios';
import { HttpsProxyAgent } from 'https-proxy-agent';

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ success: false });

  try {
    const { text, imageUrl } = req.body;
    const merchantRef = 'MENFESS-' + Date.now();
    const amount = 5000;

    // 1. Simpan ke Supabase agar data tidak hilang saat callback
    await supabase.from('transactions').insert([
      { 
        merchant_ref: merchantRef, 
        pesan: text || "Tanpa pesan", 
        foto_url: imageUrl || null, 
        status: 'UNPAID' 
      }
    ]);

    // 2. Setup Fixie Proxy Agent
    const agent = new HttpsProxyAgent(process.env.FIXIE_URL);

    // 3. Setup Tripay Credentials
    const mCode = process.env.TRIPAY_MERCHANT_CODE.trim();
    const pKey = process.env.TRIPAY_PRIVATE_KEY.trim();
    const apiKey = process.env.TRIPAY_API_KEY.trim();

    // Buat Signature
    const signature = crypto.createHmac('sha256', pKey)
      .update(mCode + merchantRef + amount).digest('hex');

    const payload = {
      method: 'QRIS',
      merchant_ref: merchantRef,
      amount: amount,
      customer_name: 'Customer Menfess',
      customer_email: 'anon@menfess.com',
      order_items: [
        {
          sku: 'MENFESS-01',
          name: 'Kirim Menfess',
          price: amount,
          quantity: 1
        }
      ],
      callback_url: `https://${req.headers.host}/api/callback`,
      signature: signature
    };

    // 4. Kirim Request ke Tripay lewat Proxy
    const response = await axios.post('https://tripay.co.id/api/transaction/create', payload, {
      httpsAgent: agent,
      headers: { 'Authorization': `Bearer ${apiKey}` }
    });

    return res.status(200).json({ success: true, data: response.data.data });
  } catch (error) {
    console.error("Error Detail:", error.response?.data || error.message);
    return res.status(500).json({ 
      success: false, 
      message: error.response?.data?.message || error.message 
    });
  }
}