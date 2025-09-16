import express from "express";
import multer from "multer";
import Twitter from "twitter-lite";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const upload = multer({ dest: "uploads/" });

// Konfigurasi Twitter API (isi dengan token kamu)
const client = new Twitter({
  consumer_key: process.env.TWITTER_CONSUMER_KEY,
  consumer_secret: process.env.TWITTER_CONSUMER_SECRET,
  access_token_key: process.env.TWITTER_ACCESS_TOKEN,
  access_token_secret: process.env.TWITTER_ACCESS_SECRET,
});

app.use(express.static("public"));
app.use(express.json());

// Endpoint untuk posting teks + foto
app.post("/upload", upload.single("image"), async (req, res) => {
  try {
    const statusText = req.body.text || "";

    if (!req.file) {
      // Hanya teks
      await client.post("statuses/update", { status: statusText });
      return res.json({ success: true, message: "Tweet teks berhasil dikirim!" });
    }

    // Kalau ada gambar
    const filePath = req.file.path;
    const mediaData = fs.readFileSync(filePath);

    // Upload gambar ke Twitter
    const media = await client.post("media/upload", {
      media: mediaData,
    });

    // Post tweet dengan gambar
    await client.post("statuses/update", {
      status: statusText,
      media_ids: media.media_id_string,
    });

    // Hapus file dari server setelah upload
    fs.unlinkSync(filePath);

    res.json({ success: true, message: "Tweet teks + foto berhasil dikirim!" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: error.message });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server berjalan di http://localhost:${port}`);
});
