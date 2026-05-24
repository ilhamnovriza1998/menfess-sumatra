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