export const config = {
  api: {
    bodyParser: true,
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method tidak diizinkan'
    });
  }

  try {
    const {
      text,
      type
    } = req.body;

    // Generate merchant ref unik
    const merchantRef = 'MENFESS-' + Date.now();

    // Data transaksi Tripay
    const data = {
      method: 'QRIS',
      merchant_ref: merchantRef,
      amount: 5000,
      customer_name: 'Anonymous',
      customer_email: 'anon@menfess.com',
      order_items: [
        {
          sku: 'MENFESS01',
          name: 'Kirim Menfess',
          price: 5000,
          quantity: 1
        }
      ],
      callback_url: 'https://menfess-sumatra.vercel.app/api/callback',
      return_url: 'https://menfess-sumatra.vercel.app',
      expired_time: Math.floor(Date.now() / 1000) + (15 * 60),
      signature: ''
    };

    // Generate Signature
    const crypto = await import('crypto');

    const signature = crypto
      .createHmac('sha256', process.env.TRIPAY_PRIVATE_KEY)
      .update(
        process.env.TRIPAY_MERCHANT_CODE +
        merchantRef +
        data.amount
      )
      .digest('hex');

    data.signature = signature;

    // Request ke Tripay Sandbox

    console.log(process.env.TRIPAY_API_KEY);
console.log(process.env.TRIPAY_PRIVATE_KEY);
console.log(process.env.TRIPAY_MERCHANT_CODE);
    
    const tripayResponse = await fetch(
      'https://tripay.co.id/api-sandbox/transaction/create',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.TRIPAY_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      }
    );

    const tripayResult = await tripayResponse.json();

    console.log('Tripay:', tripayResult);

    if (!tripayResult.success) {
      return res.status(400).json({
        success: false,
        error: tripayResult.message
      });
    }

    // Return data QRIS ke frontend
    return res.status(200).json({
      success: true,
      data: {
        reference: tripayResult.data.reference,
        merchant_ref: merchantRef,
        qr_url: tripayResult.data.qr_url,
        qr_string: tripayResult.data.qr_string,
        amount: tripayResult.data.amount,
        expired_time: tripayResult.data.expired_time
      }
    });

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
