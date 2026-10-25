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
 * Konversi teks ke format ramah pembaca & aman:
 * - Mengubah 'a/A' jadi '4' dan 'i/I' jadi '1'
 * - Pengecualian (whitelist) untuk nama daerah & hashtag (#) agar masuk algoritma X
 * - Menyisipkan Zero-Width Space (\u200B) khusus kata dengan panjang >= 3 huruf
 */
export function convertToLeet(text) {
  // Daftar nama daerah / singkatan wilayah yang tidak boleh diubah (Whitelist)
  const daftarDaerah = [
    // Wilayah & Provinsi
    "sumatra", "smtr", "smt", "aceh", "ach", "sumut", "su", "sumbar", "sb", 
    "riau", "kepri", "jambi", "jmb", "sumsel", "ss", "bengkulu", "bgl", "lampung", "lpg", "babel",
    
    // Riau & Kepri
    "pekanbaru", "pku", "dumai", "dum", "batam", "btm", "tanjungpinang", "tpi",
    "bengkalis", "siak", "kampar", "bangkinang", "pelalawan", "rokan", "rohul", "rohil",
    "inhu", "inhil", "tembilahan", "kuansing", "meranti", "selatpanjang", "karimun", "bintan",

    // Sumatra Utara
    "medan", "mdn", "binjai", "bnj", "pematangsiantar", "siantar", "str", "tebingtinggi",
    "tanjungbalai", "kisaran", "asahan", "sidempuan", "sibolga", "deliserdang", "langkat",
    "sergai", "simalungun", "toba", "balige", "samosir", "dairi", "karo", "berastagi", "madina",

    // Sumatra Barat
    "padang", "pdg", "bukittinggi", "bkt", "payakumbuh", "solok", "pariaman", "sawahlunto",
    "agam", "limapuluhkota", "tanahdatar", "batusangkar", "pasaman", "pesisirselatan", "dharmasraya",

    // Sumsel, Lampung, dll
    "palembang", "plg", "prabumulih", "lubuklinggau", "llg", "baturaja", "indralaya",
    "bandarlampung", "blp", "metro", "pringsewu", "kalianda", "bungo", "kerinci", "curup", "pangkalpinang"
  ];

  return String(text ?? '')
    .trim()
    .split(' ')
    .map((word) => {
      // 1. Jika kata diawali dengan tanda pagar (#), biarkan utuh untuk hashtag/algoritma
      if (word.startsWith('#')) {
        return word;
      }

      // 2. Bersihkan tanda baca untuk pengecekan daftar daerah
      const cleanWord = word.toLowerCase().replace(/[^a-z0-9]/g, '');

      // Jika termasuk nama daerah, biarkan asli tanpa diubah
      if (daftarDaerah.includes(cleanWord)) {
        return word;
      }

      // 3. Ubah huruf 'a/A' jadi '4' dan 'i/I' jadi '1' (lebih rapi & tidak pusing)
      let converted = word
        .replace(/a/gi, '4')
        .replace(/i/gi, '1');

      // 4. Sisipkan \u200B di tengah kata jika panjang kata >= 3 huruf
      if (converted.length >= 3) {
        const mid = Math.floor(converted.length / 2);
        return converted.slice(0, mid) + '\u200B' + converted.slice(mid);
      }

      return converted;
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