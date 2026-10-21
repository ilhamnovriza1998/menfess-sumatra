export const MENFESS_PRICES = {
  text: 5000,
  photo: 10000
};

export function normalizeMenfessType(type, fotoUrl) {
  if (type === 'photo' || Boolean(fotoUrl)) {
    return 'photo';
  }

  return 'text';
}

export function getMenfessPrice(type, fotoUrl) {
  return MENFESS_PRICES[normalizeMenfessType(type, fotoUrl)];
}

/**
 * Konversi teks ke leet-speak kasual (tanpa huruf u) & sisipkan Zero-Width Space (\u200B)
 * agar lolos dari algoritma auto-suspend / kata terlarang X & Threads.
 */
export function convertToLeet(text) {
  const replacements = {
    a: '@', e: '3', i: '!', o: '0', g: '9',
    A: '4', E: '3', I: '!', O: '0', G: '9'
  };

  // Langkah 1: Ubah huruf sesuai mapping (a, e, i, o, g)
  const leetText = String(text ?? '').replace(/[aeiogAEIOG]/g, (char) => {
    return replacements[char] || char;
  });

  // Langkah 2: Sisipkan \u200B di tengah kata (khusus kata dengan panjang > 3 huruf)
  return leetText
    .split(' ')
    .map((word) => {
      if (word.length > 3) {
        const mid = Math.floor(word.length / 2);
        return word.slice(0, mid) + '\u200B' + word.slice(mid);
      }
      return word;
    })
    .join(' ');
}

export function buildTelegramCaption(pesan, merchantRef) {
  const cleanPesan = pesan?.trim() ? convertToLeet(pesan.trim()) : 'Tanpa pesan';

  return [
    `==== MENFESS SUMATRA ====`,
    '',
    cleanPesan,
    '',
    `#Ref: ${merchantRef}`
  ].join('\n');
}

export function getBaseUrl(req) {
  const configuredUrl = process.env.PUBLIC_BASE_URL || process.env.VERCEL_URL;

  if (configuredUrl) {
    const formattedUrl = configuredUrl.startsWith('http')
      ? configuredUrl
      : `https://${configuredUrl}`;

    return formattedUrl.replace(/\/+$/, '');
  }

  const host = req?.headers?.host;
  if (!host) {
    return 'http://localhost:3000';
  }

  const protocol = host.includes('localhost') || host.startsWith('127.0.0.1')
    ? 'http'
    : 'https';

  return `${protocol}://${host.replace(/\/+$/, '')}`;
}