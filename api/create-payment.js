import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import axios from 'axios';

// Inisialisasi Supabase dengan variabel otomatis Vercel
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ success: false, message: 'Method Not Allowed' });

  try {
    const { text, imageUrl } = req.body;
    const merchantRef = 'MENFESS-' + Date.now();
    const amount = 1000; // Harga menfess

    // 1. Simpan data ke database Supabase sebelum ke Tripay
    const { error: dbError } = await supabase.from('transactions').insert([
      { 
        merchant_ref: merchantRef, 
        pesan: text || "Tanpa pesan", 
        foto_url: imageUrl || null, 
        status: 'UNPAID' 
      }
    ]);

    if (dbError) throw new Error("Gagal simpan ke Database: " + dbError.message);

    // 2. Setup Tripay
    const mCode = process.env.TRIPAY_MERCHANT_CODE.trim();
    const pKey = process.env.TRIPAY_PRIVATE_KEY.trim();
    const apiKey = process.env.TRIPAY_API_KEY.trim();

    const signature = crypto.createHmac('sha256', pKey)
      .update(mCode + merchantRef + amount).digest('hex');

    const payload = {
      method: 'QRIS',
      merchant_ref: merchantRef,
      amount: amount,
      customer_name: 'Customer Menfess',
      customer_email: 'anon@menfess.com',
      callback_url: `https://${req.headers.host}/api/callback`,
      signature: signature
    };

    const response = await axios.post('https://tripay.co.id/api/transaction/create', payload, {
      headers: { 'Authorization': `Bearer ${apiKey}` }
    });

    return res.status(200).json({ success: true, data: response.data.data });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, error: error.message });
  }
}