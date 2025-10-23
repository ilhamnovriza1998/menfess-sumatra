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
    const imageFile = files.image?.[0];

    if (!text.trim()) {
      return res
        .status(400)
        .json({ success: false, error: "Teks tidak boleh kosong." });
    }

    let result;

    // 🖼️ Jika ada file foto, kirim sebagai foto + caption
    if (type === "photo" && imageFile) {
      const filePath = imageFile.filepath || imageFile.file;
      if (!fs.existsSync(filePath)) {
        throw new Error("File gambar tidak ditemukan atau gagal diupload.");
      }

      const fileBuffer = fs.readFileSync(filePath);

      result = await bot.telegram.sendPhoto(
        channelTarget,
        { source: fileBuffer },
        {
          caption: text,
          parse_mode: "HTML",
        }
      );
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
  } catch (error) {
    console.error("❌ Error Telegram:", error);
    return res.status(500).json({
      success: false,
      error:
        error.message ||
        "Terjadi kesalahan tidak dikenal saat mengirim ke Telegram.",
    });
  }
        }
