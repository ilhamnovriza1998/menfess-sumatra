```js
import crypto from 'crypto';
import axios from 'axios';
import HttpsProxyAgent from 'https-proxy-agent';

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

    // Proxy Agent
    const proxyAgent = new HttpsProxyAgent(
      process.env.PROXY_URL
    );

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

        httpsAgent: proxyAgent
      }
    );

    const tripayResult = tripayResponse.data;

    console.log(tripayResult);

    if (!tripayResult.success) {

      return res.status(400).json({
        success: false,
        error: tripayResult.message
      });

    }

    return res.status(200).json({
      success: true,

      data: {
        reference:
          tripayResult.data.reference,

        qr_url:
          tripayResult.data.qr_url,

        amount:
          tripayResult.data.amount
      }
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
```
