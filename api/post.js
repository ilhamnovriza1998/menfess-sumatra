import Twitter from "twitter-lite";
import formidable from "formidable";
import fs from "fs";

export const config = {
  api: {
    bodyParser: false, // penting supaya formidable jalan
  },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const form = formidable({ multiples: false });
  form.parse(req, async (err, fields, files) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: "Form parse error" });
    }

    try {
      const client = new Twitter({
        consumer_key: process.env.TWITTER_CONSUMER_KEY,
        consumer_secret: process.env.TWITTER_CONSUMER_SECRET,
        access_token_key: process.env.TWITTER_ACCESS_TOKEN,
        access_token_secret: process.env.TWITTER_ACCESS_SECRET,
      });

      const status = fields.text || "Menfess tanpa teks";

      if (files.image) {
        const b64content = fs.readFileSync(files.image.filepath, { encoding: "base64" });
        const media = await client.post("media/upload", { media_data: b64content });
        const tweet = await client.post("statuses/update", {
          status,
          media_ids: media.media_id_string,
        });
        return res.status(200).json({ success: true, tweet });
      } else {
        const tweet = await client.post("statuses/update", { status });
        return res.status(200).json({ success: true, tweet });
      }
    } catch (error) {
      console.error("Twitter error:", error);
      return res.status(500).json({ error: "Twitter API error" });
    }
  });
        }
