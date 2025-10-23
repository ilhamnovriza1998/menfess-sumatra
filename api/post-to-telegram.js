// api/post-to-telegram.js
import { Telegraf } from "telegraf";
import formidable from "formidable";
import fs from "fs";

// ✅ Nonaktifkan bodyParser default agar bisa parse FormData (multipart)
export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,PATCH,DELETE,POST,PUT");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  try {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const channelTarget = process.env.TELEGRAM_CHANNEL;
    if (!botToken || !channelTarget)
      throw new Error("Environment variable TELEGRAM_BOT_TOKEN atau TELEGRAM_CHANNEL belum diatur");

    const bot = new Telegraf(botToken);

    // ✅ Gunakan formidable untuk parse FormData
    const form = formidable({ multiples: false });
    const [fields, files] = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err);
        else resolve([fields, files]);
      });
    });

    const text = fields.text ? fields.text.toString() : "";
    const type = fields.type ? fields.type.toString() : "text";
    const imageFile = files.image;

    if (!text || text.trim() === "") {
      return res.status(400).json({ success: false, error: "Teks tidak boleh kosong" });
    }

    let result;
    if (type === "photo" && imageFile) {
      const fileBuffer = fs.readFileSync(imageFile[0].filepath);
      result = await bot.telegram.sendPhoto(channelTarget, { source: fileBuffer }, { caption: text, parse_mode: "HTML" });
    } else {
      result = await bot.telegram.sendMessage(channelTarget, text, { parse_mode: "HTML" });
    }

    res.status(200).json({
      success: true,
      message: "✅ Menfess berhasil dikirim ke Telegram!",
      messageId: result.message_id,
    });
  } catch (error) {
    console.error("❌ Error Telegram:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Terjadi kesalahan saat mengirim",
    });
  }
                                   }
