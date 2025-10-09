import Twitter from "twitter-lite";
import formidable from "formidable";
import fs from "fs";

// Matikan bodyParser bawaan biar formidable bisa handle multipart/form-data
export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const form = formidable({ multiples: false });
    form.parse(req, async (err, fields, files) => {
      if (err) {
        console.error("Form parse error:", err);
        return res.status(400).json({ error: "Error parsing form data" });
      }

      const text = fields.text || "";
      const file = files.image;

      // Pastikan semua key env terbaca
      const client = new Twitter({
        consumer_key: process.env.TWITTER_API_KEY,
        consumer_secret: process.env.TWITTER_API_KEY_SECRET,
        access_token_key: process.env.TWITTER_ACCESS_TOKEN,
        access_token_secret: process.env.TWITTER_ACCESS_TOKEN_SECRET,
      });

      let mediaId = null;

      // Kalau ada file, upload ke Twitter
      if (file && file.filepath) {
        try {
          const imageData = fs.readFileSync(file.filepath);
          const media = await client.post("media/upload", {
            media_data: imageData.toString("base64"),
          });
          mediaId = media.media_id_string;
        } catch (uploadError) {
          console.error("Media upload error:", uploadError);
        }
      }

      // Posting tweet
      const params = mediaId
        ? { status: text, media_ids: mediaId }
        : { status: text };

      const tweet = await client.post("statuses/update", params);
      console.log("Tweet success:", tweet.id_str);

      res.status(200).json({ success: true, tweet });
    });
  } catch (error) {
    console.error("Handler error:", error);
    res.status(500).json({ error: error.message });
  }
}
