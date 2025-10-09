import Twitter from "twitter-lite";
import { formidable } from "formidable";
import fs from "fs";

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  console.log("🔹 API postToTwitter dipanggil:", req.method);

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const form = formidable({ multiples: false });

  form.parse(req, async (err, fields, files) => {
    if (err) {
      console.error("❌ Error parsing form:", err);
      return res.status(400).json({ error: "Error parsing form data" });
    }

    const text = fields.text?.[0] || fields.text || "";
    const file = files.image?.[0] || files.image;

    console.log("📩 Data diterima:", { text, hasFile: !!file });

    // Cek kredensial
    const client = new Twitter({
      consumer_key: process.env.TWITTER_API_KEY,
      consumer_secret: process.env.TWITTER_API_KEY_SECRET,
      access_token_key: process.env.TWITTER_ACCESS_TOKEN,
      access_token_secret: process.env.TWITTER_ACCESS_TOKEN_SECRET,
    });

    try {
      let mediaId = null;

      // Upload gambar dulu jika ada
      if (file && file.filepath) {
        console.log("📤 Upload gambar ke X...");
        const imageData = fs.readFileSync(file.filepath);
        const media = await client.post("media/upload", {
          media_data: imageData.toString("base64"),
        });
        mediaId = media.media_id_string;
        console.log("✅ Upload sukses:", mediaId);
      }

      // Kirim tweet
      const params = mediaId
        ? { status: text, media_ids: mediaId }
        : { status: text };

      console.log("🚀 Posting tweet:", params);

      const tweet = await client.post("statuses/update", params);

      console.log("📬 Respon sukses:", tweet);

      return res.status(200).json({ success: true, tweet });
    } catch (error) {
      console.error("🔥 ERROR:", error);
      return res.status(500).json({ error: error.message });
    }
  });
}
