import formidable from 'formidable';
import fs from 'fs';
import path from 'path';
import { applyWatermark } from '../lib/watermark.js';
import { uploadImage } from '../lib/upload.js';
import { normalizeMenfessType } from '../lib/menfess.js';
import { createPendingTransaction } from '../lib/transactions.js';
import { isEmptyText } from '../lib/utils.js';

export const config = {
  api: {
    bodyParser: false
  }
};

const WATERMARK_PATH = path.join(process.cwd(), 'public', 'watermark.png');

function getSingleValue(value) {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

function getSingleFile(value) {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

async function parseMultipart(req) {
  const form = formidable({
    multiples: false,
    maxFileSize: 10 * 1024 * 1024,
    keepExtensions: true
  });

  return await new Promise((resolve, reject) => {
    form.parse(req, (err, fields, files) => {
      if (err) {
        reject(err);
        return;
      }

      resolve({ fields, files });
    });
  });
}

async function watermarkAndUpload(imageFile) {
  const filePath = imageFile?.filepath;

  if (!filePath || !fs.existsSync(filePath)) {
    throw new Error('Tidak ada file foto yang terdeteksi.');
  }

  let imageBuffer;

  if (fs.existsSync(WATERMARK_PATH)) {
    imageBuffer = await applyWatermark(filePath, WATERMARK_PATH);
  } else {
    console.warn('File watermark.png tidak ditemukan:', WATERMARK_PATH);
    imageBuffer = fs.readFileSync(filePath);
  }

  return await uploadImage(imageBuffer, `${Date.now()}.jpg`);
}

function removeTempFile(imageFile) {
  const filePath = imageFile?.filepath;

  if (filePath && fs.existsSync(filePath)) {
    fs.unlink(filePath, (err) => {
      if (err) {
        console.error('Gagal menghapus file sementara:', err);
      }
    });
  }
}

export default async function handler(req, res) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed. Gunakan POST untuk mengirim menfess.'
    });
  }

  let imageFile;

  try {
    const { fields, files } = await parseMultipart(req);

    const text = String(getSingleValue(fields.text) || '').trim();
    const requestedType = String(getSingleValue(fields.type) || 'text');
    imageFile = getSingleFile(files.image);
    const type = normalizeMenfessType(requestedType, imageFile);

    if (type === 'text' && isEmptyText(text)) {
      return res.status(400).json({
        success: false,
        error: 'Teks menfess tidak boleh kosong.'
      });
    }

    if (type === 'photo' && !imageFile) {
      return res.status(400).json({
        success: false,
        error: 'Pilih foto terlebih dahulu sebelum mengirim.'
      });
    }

    const fotoUrl = type === 'photo'
      ? await watermarkAndUpload(imageFile)
      : null;

    const { merchantRef, amount, payment } = await createPendingTransaction({
      req,
      pesan: text,
      type,
      fotoUrl
    });

    return res.status(200).json({
      success: true,
      merchant_ref: merchantRef,
      amount,
      data: payment.data
    });
  } catch (error) {
    console.error('Error submit menfess:', error.response?.data || error);

    return res.status(500).json({
      success: false,
      error: error.response?.data?.message || error.message || 'Terjadi kesalahan saat membuat pembayaran.'
    });
  } finally {
    removeTempFile(imageFile);
  }
}
