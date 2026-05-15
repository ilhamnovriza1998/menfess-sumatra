// api/post-to-telegram.js
import { Telegraf } from "telegraf";
import formidable from "formidable";
import fs from "fs";
import path from 'path'; // <--- BARU: Untuk menangani jalur file absolut
import Jimp from 'jimp'; // <--- BARU: Untuk memproses dan watermarking gambar

// ✅ Nonaktifkan bodyParser bawaan Next/Vercel agar bisa handle multipart (upload foto)
export const config = {
  api: {
    bodyParser: false,
  },
};

// Definisikan jalur absolut ke file watermark
// Ini memastikan Vercel dapat menemukan file yang ada di folder 'public'
const WATERMARK_PATH = path.join(process.cwd(), 'public', 'watermark.png'); 

export default async function handler(req, res) {
  // 🌐 Izinkan CORS agar bisa diakses dari front-end HTML mana pun
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // 🚫 Tolak method selain POST
  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      error: "Method not allowed. Gunakan POST untuk mengirim menfess.",
    });
  }

  // --- Mulai Blok Try/Catch ---
  try {
    // 🧩 Ambil token & channel dari environment Vercel
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const channelTarget = process.env.TELEGRAM_CHANNEL;

    if (!botToken || !channelTarget) {
      throw new Error(
        "Environment variable TELEGRAM_BOT_TOKEN atau TELEGRAM_CHANNEL belum diatur di Vercel."
      );
    }

    const bot = new Telegraf(botToken);

    // 📦 Parse form-data (FormData dari frontend)
    const form = formidable({
      multiples: false,
      maxFileSize: 10 * 1024 * 1024, // batas 10 MB
      keepExtensions: true,
    });

    const [fields, files] = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err);
        else resolve([fields, files]);
      });
    });

    // 🧾 Ambil data teks & tipe kiriman
    const text = fields.text?.toString() || "";
    const type = fields.type?.toString() || "text";

    // Perbaikan: Pastikan pengambilan file image sesuai struktur formidable
    const imageFile = files.image?.[0]; 

    if (!text.trim() && type !== "photo") {
      return res
        .status(400)
        .json({ success: false, error: "Teks menfess tidak boleh kosong." });
    }

    let result;
    
    // 🖼️ Jika ada file foto, kirim sebagai foto + caption
    if (type === "photo" && imageFile) {
      // Ambil jalur file sementara
      const filePath = imageFile.filepath; 

      if (!filePath || !fs.existsSync(filePath)) {
        return res.status(400).json({ success: false, error: "Tidak ada file foto yang terdeteksi." });
      }

      let finalBuffer; // Buffer yang akan dikirim ke Telegram (sudah di-watermark)
      let originalBuffer; // Buffer file asli dari upload

      // 1. Baca file foto asli dan lakukan Watermarking
      try {
        
        // Baca file foto asli
        originalBuffer = fs.readFileSync(filePath);
        
        // Cek apakah file watermark ada
        if (!fs.existsSync(WATERMARK_PATH)) {
            console.warn("⚠️ File watermark.png tidak ditemukan di path:", WATERMARK_PATH);
            // Jika watermark hilang, gunakan buffer asli sebagai fallback
            finalBuffer = originalBuffer; 
            throw new Error("Watermark file not found, sending original photo."); 
        }
        
        // Proses Jimp
        const image = await Jimp.read(originalBuffer);
        const watermark = await Jimp.read(WATERMARK_PATH);

        // Atur ukuran watermark (misalnya, menjadi 1/5 lebar foto)
        watermark.resize(image.bitmap.width / 5, Jimp.AUTO); 
        
        // Atur opacity watermark (50%)
        watermark.opacity(0.5);

        // Hitung posisi (sudut kanan bawah dengan padding 20px)
        const x = image.bitmap.width - watermark.bitmap.width - 20;
        const y = image.bitmap.height - watermark.bitmap.height - 20;

        // Gabungkan watermark ke gambar
        image.composite(watermark, x, y); 

        // Dapatkan Buffer gambar hasil watermarking (menggunakan format JPEG untuk Telegram)
        finalBuffer = await image.getBufferAsync(Jimp.MIME_JPEG);
        
        console.log("✅ Watermarking berhasil dilakukan.");

      } catch (watermarkError) {
        console.error("❌ Gagal saat watermarking:", watermarkError.message);
        // Fallback: Jika terjadi error (misal Jimp gagal), kirim buffer asli
        if (!finalBuffer) {
           finalBuffer = originalBuffer || fs.readFileSync(filePath);
        }
      } 
      
      // 2. Kirim ke Telegram (menggunakan finalBuffer)
      try {
        result = await bot.telegram.sendPhoto(
          channelTarget,
          { 
            source: finalBuffer, // Menggunakan finalBuffer (yang sudah di-watermark atau asli)
            filename: imageFile.originalFilename || 'photo.jpg'
          },
          {
            caption: text,
            parse_mode: "HTML",
          }
        );
      } finally {
        // PENTING: Hapus file sementara di Vercel setelah berhasil atau gagal dikirim
        fs.unlink(filePath, (err) => {
          if (err) {
            console.error(`⚠️ Gagal menghapus file sementara: ${filePath}`, err);
          } else {
            console.log(`🗑️ File sementara berhasil dihapus: ${filePath}`);
          }
        });
      }

    } else {
      // 💬 Kirim teks biasa
      result = await bot.telegram.sendMessage(channelTarget, text, {
        parse_mode: "HTML",
      });
    }

    // ✅ Kirim respons sukses ke frontend
    return res.status(200).json({
      success: true,
      message: "✅ Menfess berhasil dikirim ke Telegram!",
      messageId: result.message_id || null,
    });

  // --- Akhir Blok Try/Catch ---
  } catch (error) {
    console.error("❌ Error Telegram:", error);
    // Tambahkan error handling yang lebih spesifik untuk token/channel
    const displayError = error.message.includes("400") || error.message.includes("404") || error.message.includes("403")
      ? "Gagal mengirim. Pastikan token bot dan ID channel sudah benar (dan bot adalah admin)."
      : error.message;

    return res.status(500).json({
      success: false,
      error: displayError || "Terjadi kesalahan tidak dikenal saat mengirim ke Telegram.",
    });
  }
}
