// api/post-to-telegram.js
import { Telegraf } from "telegraf";
import formidable from "formidable";
import fs from "fs";

// ✅ Nonaktifkan bodyParser bawaan Next/Vercel agar bisa handle multipart (upload foto)
export const config = {
  api: {
    bodyParser: false,
  },
};

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
        // Jika file tidak ada, ini mungkin akibat user menekan kirim tanpa memilih file (meski sudah divalidasi di frontend)
        return res.status(400).json({ success: false, error: "Tidak ada file foto yang terdeteksi." });
      }

      let fileBuffer;
      try {
        // Ambil isi file sebagai Buffer
        fileBuffer = fs.readFileSync(filePath);
      } catch (readError) {
        console.error("Gagal membaca file sementara:", readError);
        throw new Error("Gagal memproses file foto.");
      }
      
      try {
        // KIRIM FOTO KE TELEGRAM
        result = await bot.telegram.sendPhoto(
          channelTarget,
          { 
            source: fileBuffer,
            filename: imageFile.originalFilename || 'photo.jpg' // Tambah nama file untuk Telegraf
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
