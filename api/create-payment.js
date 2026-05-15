import crypto from 'crypto';
import axios from 'axios';

export default async function handler(req, res) {

  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method tidak diizinkan'
    });
  }

  try {

    const merchantRef =
      'MENFESS-' + Date.now();

    const amount = 5000;

    const signature = crypto
      .createHmac(
        'sha256',
        process.env.TRIPAY_PRIVATE_KEY
      )
      .update(
        process.env.TRIPAY_MERCHANT_CODE +
        merchantRef +
        amount
      )
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

      callback_url:
        'https://menfess-sumatra.vercel.app/api/callback',

      return_url:
        'https://menfess-sumatra.vercel.app',

      expired_time:
        Math.floor(Date.now() / 1000) + (15 * 60),

      signature: signature
    };

    // Parse proxy URL
    const proxyUrl = new URL(process.env.PROXY_URL);

    const tripayResponse = await axios.post(
      'https://tripay.co.id/api/transaction/create',
      payload,
      {
        headers: {
          Authorization:
            'Bearer ' + process.env.TRIPAY_API_KEY,

          'Content-Type':
            'application/json'
        },

        proxy: {
          host: proxyUrl.hostname,
          port: Number(proxyUrl.port),
          protocol: 'http',
          auth: {
            username: proxyUrl.username,
            password: proxyUrl.password
          }
        }
      }
    );

    const tripayResult = tripayResponse.data;

    return res.status(200).json({
      success: true,
      data: tripayResult.data
    });

  } catch (error) {

    console.log(error);

    return res.status(500).json({
      success: false,
      error:
        error.response?.data ||
        error.message
    });

  }

}