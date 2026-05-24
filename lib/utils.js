export function generateMerchantRef() {
  return 'TRX-' + Date.now();
}

export function sanitizeText(text = '') {
  return text.trim();
}

export function isEmptyText(text = '') {
  return !text.trim();
}