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
      console.log("FIELDS:", fields);
      console.log("FILES:", files);

      const file = files.file?.[0];
      if (!file) {
        console.error("No file uploaded");
        return res.status(400).json({ error: "No file uploaded" });
      }

      // convert file ke base64
      const mediaData = fs.readFileSync(file.path, { encoding: "base64" });
      console.log("MediaData length:", mediaData.length);

      const client = new Twitter({
        subdomain: "api",
        version: "1.1",
        consumer_key: process.env.TWITTER_CONSUMER_KEY,
        consumer_secret: process.env.TWITTER_CONSUMER_SECRET,
        access_token_key: process.env.TWITTER_ACCESS_TOKEN,
        access_token_secret: process.env.TWITTER_ACCESS_SECRET,
      });

      // Upload media
      const media = await client.post("media/upload", {
        media_data: mediaData,
      });

      console.log("UPLOAD RESPONSE:", media);

      // Post tweet
      const status = fields.text?.[0] || "Tanpa teks";
      const tweet = await client.post("statuses/update", {
        status,
        media_ids: media.media_id_string,
      });

      res.status(200).json(tweet);
    } catch (error) {
      console.error("Handler/Twitter error:", error);
      res.status(500).json({ error: error.message });
    }
  });
}
