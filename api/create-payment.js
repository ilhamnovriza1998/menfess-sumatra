import crypto from 'crypto';

export default async function handler(req, res) {

  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method tidak diizinkan'
    });
  }

  try {

    console.log('=== START CREATE PAYMENT ===');

    console.log('ENV CHECK:', {
      API_KEY: !!process.env.TRIPAY_API_KEY,
      PRIVATE_KEY: !!process.env.TRIPAY_PRIVATE_KEY,
      MERCHANT_CODE: !!process.env.TRIPAY_MERCHANT_CODE
    });

    const merchantRef =
      'MENFESS-' + Date.now();

    const amount = 5000;

    const rawSignature =
      process.env.TRIPAY_MERCHANT_CODE +
      merchantRef +
      amount;

    console.log('RAW SIGNATURE:', rawSignature);

    const signature = crypto
      .createHmac(
        'sha256',
        process.env.TRIPAY_PRIVATE_KEY
      )
      .update(rawSignature)
      .digest('hex');

    console.log('SIGNATURE:', signature);

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

    console.log('PAYLOAD:', payload);

    const tripayResponse = await fetch(
      'https://tripay.co.id/api-sandbox/transaction/create',
      {
        method: 'POST',

        headers: {
          Authorization:
            `Bearer ${process.env.TRIPAY_API_KEY}`,

          'Content-Type':
            'application/json'
        },

        body: JSON.stringify(payload)
      }
    );

    console.log(
      'TRIPAY STATUS:',
      tripayResponse.status
    );

    const text =
      await tripayResponse.text();

    console.log('TRIPAY RAW:', text);

    return res.status(200).json({
      success: true,
      raw: text
    });

  } catch (error) {

    console.error('FULL ERROR:', error);

    return res.status(500).json({
      success: false,
      error: String(error)
    });

  }

}
