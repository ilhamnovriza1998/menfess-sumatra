import { supabase } from './supabase.js';
import { createTransaction } from './payment.js';
import { getBaseUrl, getMenfessPrice } from './menfess.js';
import { generateMerchantRef } from './utils.js';

export async function createPendingTransaction({
  req,
  pesan,
  type,
  fotoUrl = null
}) {
  const merchantRef = generateMerchantRef();
  const amount = getMenfessPrice(type);
  const baseUrl = getBaseUrl(req);

  const { error: insertError } = await supabase
    .from('transactions')
    .insert([
      {
        merchant_ref: merchantRef,
        pesan: pesan || 'Tanpa pesan',
        foto_url: fotoUrl,
        status: 'UNPAID'
      }
    ]);

  if (insertError) {
    throw insertError;
  }

  const payment = await createTransaction(
    merchantRef,
    amount,
    {
      callbackUrl: `${baseUrl}/api/callback`,
      returnUrl: baseUrl
    }
  );

  return {
    merchantRef,
    amount,
    payment
  };
}
