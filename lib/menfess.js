export const MENFESS_PRICES = {
  text: 5000,
  photo: 10000
};

export function normalizeMenfessType(type, fotoUrl) {
  if (type === 'photo' || fotoUrl) {
    return 'photo';
  }

  return 'text';
}

export function getMenfessPrice(type) {
  return MENFESS_PRICES[normalizeMenfessType(type)];
}

export function buildTelegramCaption(pesan, merchantRef, base = 'SUMATRA') {
  const baseName = String(base || 'SUMATRA').trim().toUpperCase();

  return [
    `==== ALTER BASE ${baseName || 'SUMATRA'} ====`,
    '',
    pesan || 'Tanpa pesan',
    '',
    `#Ref: ${merchantRef}`
  ].join('\n');
}

export function getBaseUrl(req) {
  const configuredUrl = process.env.PUBLIC_BASE_URL || process.env.VERCEL_URL;

  if (configuredUrl) {
    return configuredUrl.startsWith('http')
      ? configuredUrl.replace(/\/$/, '')
      : `https://${configuredUrl.replace(/\/$/, '')}`;
  }

  const host = req?.headers?.host;
  if (!host) {
    return 'http://localhost:3000';
  }

  const protocol = host.includes('localhost') || host.startsWith('127.0.0.1')
    ? 'http'
    : 'https';

  return `${protocol}://${host}`;
}
