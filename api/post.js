import Twitter from "twitter-lite";
import fs from "fs";
import multiparty from "multiparty";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const form = new multiparty.Form();

  form.parse(req, async (err, fields, files) => {
    if (err) return res.status(500).json({ error: err.message });

    try {
      const status = fields.text?.[0] || "Tanpa teks";

      const client = new Twitter({
        subdomain: "api",
        version: "1.1",
        consumer_key: process.env.TWITTER_CONSUMER_KEY,
        consumer_secret: process.env.TWITTER_CONSUMER_SECRET,
        access_token_key: process.env.TWITTER_ACCESS_TOKEN,
        access_token_secret: process.env.TWITTER_ACCESS_SECRET,
      });

      let mediaId = null;

      // kalau ada file, upload dulu
      const file = files.file?.[0];
      if (file) {
        const mediaData = fs.readFileSync(file.path, { encoding: "base64" });
        const media = await client.post("media/upload", {
          media_data: mediaData,
        });
        mediaId = media.media_id_string;
      }

      // post tweet
      const tweetPayload = mediaId
        ? { status, media_ids: mediaId }
        : { status };

      const tweet = await client.post("statuses/update", tweetPayload);

      res.status(200).json(tweet);
    } catch (error) {
      console.error("Handler/Twitter error:", error);
      res.status(500).json({ error: error.message });
    }
  });
}
