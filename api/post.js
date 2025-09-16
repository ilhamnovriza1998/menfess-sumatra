import multiparty from "multiparty";
import fs from "fs";
import Twitter from "twitter-lite";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  const form = new multiparty.Form();

  form.parse(req, async (err, fields, files) => {
    if (err) {
      console.error("Parse error:", err);
      return res.status(400).json({ success: false, error: "Invalid form data" });
    }
    const text = (fields.text && fields.text[0]) || "";

    try {
      const client = new Twitter({
        consumer_key: process.env.TWITTER_CONSUMER_KEY,
        consumer_secret: process.env.TWITTER_CONSUMER_SECRET,
        access_token_key: process.env.TWITTER_ACCESS_TOKEN,
        access_token_secret: process.env.TWITTER_ACCESS_SECRET,
      });

      let mediaId = null;
      if (files.image && files.image[0] && files.image[0].path) {
        const imgPath = files.image[0].path;
        const imgData = fs.readFileSync(imgPath);
        const b64 = imgData.toString("base64");

        const mediaRes = await client.post("media/upload", { media: b64 });
        mediaId = mediaRes.media_id_string;

        try { fs.unlinkSync(imgPath); } catch(e) { /* ignore */ }
      }

      const params = { status: text };
      if (mediaId) {
        params.media_ids = mediaId;
      }

      const tweet = await client.post("statuses/update", params);

      return res.status(200).json({ success: true, tweet });
    } catch (error) {
      console.error("Twitter error:", error);
      return res.status(500).json({ success: false, error: error.message || "Unknown error" });
    }
  });
}
