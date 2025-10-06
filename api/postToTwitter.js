import Twitter from "twitter-lite";
import formidable from "formidable";
import fs from "fs";

export const config = {
  api: {
    bodyParser: false, // kita pakai formidable buat handle upload
  },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const form = new formidable.IncomingForm();

  form.parse(req, async (err, fields, files) => {
    if (err) {
      console.error(err);
      return res.status(400).json({ error: "Error parsing form data" });
    }

    const text = fields.text?.[0] || fields.text || "";
    const file = files.image?.[0] || files.image;

    const client = new Twitter({
      consumer_key: process.env.TWITTER_API_KEY,
      consumer_secret: process.env.TWITTER_API_KEY_SECRET,
      access_token_key: process.env.TWITTER_ACCESS_TOKEN,
      access_token_secret: process.env.TWITTER_ACCESS_TOKEN_SECRET,
    });

    try {
      let mediaId = null;

      // Kalau ada gambar, upload dulu
      if (file && file.filepath) {
        const imageData = fs.readFileSync(file.filepath);
        const media = await client.post("media/upload", {
          media: imageData.toString("base64"),
        });
        mediaId = media.media_id_string;
      }

      // Posting tweet
      const params = mediaId
        ? { status: text, media_ids: mediaId }
        : { status: text };

      const tweet = await client.post("statuses/update", params);

      res.status(200).json({ success: true, tweet });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: error.message });
    }
  });
}
