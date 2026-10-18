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

export function getMenfessPrice(type, fotoUrl) {
  return MENFESS_PRICES[normalizeMenfessType(type, fotoUrl)];
}

export function convertToLeet(text) {
  return String(text ?? '').replace(/[aegiosz]/gi, (character) => {
    const replacements = {
      a: '@',
      e: '3',
      g: '9',
      i: '1',
      o: '0',
      s: '5',
      z: '2',
      A: '@',
      E: '3',
      G: '9',
      I: '1',
      O: '0',
      S: '5',
      Z: '2'
    };

    return replacements[character.toLowerCase()];
  });
}

export function buildTelegramCaption(pesan, merchantRef) {
  
  return [
    `==== MENFESS SUMATRA ====`,
    '',
    convertToLeet(pesan || 'Tanpa pesan'),
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
