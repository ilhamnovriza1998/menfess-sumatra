import Twitter from "twitter-lite";
import formidable from "formidable";
import fs from "fs";

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  console.log("🔹 API postToTwitter dipanggil:", req.method);

  const form = formidable({ multiples: false });

  form.parse(req, async (err, fields, files) => {
    if (err) {
      console.error("❌ Form parse error:", err);
      return res.status(400).json({ error: "Error parsing form data" });
    }

    const text = fields.text || "";
    const image = files.image;

    console.log("📩 Text:", text, "File:", image ? "Ada gambar" : "Tidak ada");

    const client = new Twitter({
      subdomain: "api",
      version: "1.1",
      consumer_key: process.env.TWITTER_API_KEY,
      consumer_secret: process.env.TWITTER_API_KEY_SECRET,
      access_token_key: process.env.TWITTER_ACCESS_TOKEN,
      access_token_secret: process.env.TWITTER_ACCESS_TOKEN_SECRET,
    });

    try {
      let mediaId = null;

      if (image && image.filepath) {
        const imageData = fs.readFileSync(image.filepath);
        const media = await client.post("media/upload", {
          media: imageData,
        });
        mediaId = media.media_id_string;
      }

      const params = mediaId
        ? { status: text, media_ids: mediaId }
        : { status: text };

      const tweet = await client.post("statuses/update", params);
      console.log("✅ Tweet berhasil:", tweet.id_str);

      res.status(200).json({ success: true, tweet });
    } catch (error) {
      console.error("🔥 ERROR:", error);
      res.status(500).json({ error: error.message });
    }
  });
}
