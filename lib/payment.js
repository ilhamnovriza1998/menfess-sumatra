import crypto from 'crypto';
import axios from 'axios';
import { HttpsProxyAgent } from 'https-proxy-agent';

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
  amount,
  {
    callbackUrl,
    returnUrl,
    customerName = 'Menfess User',
    customerEmail = 'anon@menfess.com'
  } = {}
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
    customer_name: customerName,
    customer_email: customerEmail,
    order_items: [
      {
        sku: 'MENFESS',
        name: 'Kirim Menfess',
        price: amount,
        quantity: 1
      }
    ],
    callback_url:
      callbackUrl || process.env.TRIPAY_CALLBACK_URL,
    return_url:
      returnUrl || process.env.TRIPAY_RETURN_URL,
    expired_time:
      Math.floor(Date.now() / 1000) +
      (24 * 60 * 60),
    signature
  };

  const axiosOptions = {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
  };

  if (process.env.FIXIE_URL) {
    axiosOptions.httpsAgent = new HttpsProxyAgent(process.env.FIXIE_URL);
  }

  const response = await axios.post(
    'https://tripay.co.id/api/transaction/create',
    payload,
    axiosOptions
  );

  if (!response.data?.success) {
    throw new Error(response.data?.message || 'Gagal membuat transaksi Tripay');
  }

  return response.data;
}

export function verifyTripayCallback(body, callbackSignature) {
  const signature = crypto
    .createHmac('sha256', process.env.TRIPAY_PRIVATE_KEY.trim())
    .update(JSON.stringify(body))
    .digest('hex');

  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(callbackSignature || '')
    );
  } catch {
    return false;
  }
}

export async function fetchTripayTransaction(reference) {
  const axiosOptions = {
    headers: {
      Authorization: `Bearer ${process.env.TRIPAY_API_KEY.trim()}`
    }
  };

  if (process.env.FIXIE_URL) {
    axiosOptions.httpsAgent = new HttpsProxyAgent(process.env.FIXIE_URL);
  }

  const response = await axios.get(
    'https://tripay.co.id/api/transaction/detail',
    {
      ...axiosOptions,
      params: { reference }
    }
  );

  return response.data;
}
