import crypto from 'crypto';

export function createSignature(
  merchantCode,
  merchantRef,
  amount,
  privateKey
) {
  return crypto
    .createHmac('sha256', privateKey)
    .update(
      merchantCode +
      merchantRef +
      amount
    )
    .digest('hex');
}

export async function createTransaction(
  merchantRef,
  amount
) {

  const mCode =
    process.env.TRIPAY_MERCHANT_CODE.trim();

  const pKey =
    process.env.TRIPAY_PRIVATE_KEY.trim();

  const apiKey =
    process.env.TRIPAY_API_KEY.trim();

  const signature = createSignature(
    mCode,
    merchantRef,
    amount,
    pKey
  );

  const payload = {
    method: 'QRIS',
    merchant_ref: merchantRef,
    amount,
    customer_name: 'Menfess User',
    order_items: [
      {
        sku: 'MENFESS',
        name: 'Kirim Menfess',
        price: amount,
        quantity: 1
      }
    ],
    callback_url:
      'https://menfesssumatra.site/api/callback',
    return_url:
      'https://menfesssumatra.site',
    expired_time:
      Math.floor(Date.now() / 1000) +
      (24 * 60 * 60),
    signature
  };

  const response = await fetch(
    'https://tripay.co.id/api/transaction/create',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    }
  );

  return await response.json();
}