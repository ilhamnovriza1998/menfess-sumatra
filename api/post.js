import multiparty from "multiparty";
import fs from "fs";
import Twitter from "twitter-lite";

export const config = {
  api: {
    bodyParser: false, // penting biar multiparty bisa parsing form-data
  },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const form = new multiparty.Form();

  form.parse(req, async (err, fields, files) => {
    if (err) {
      console.error("Form parse error:", err);
      return res.status(500).json({ error: "Form parsing failed" });
    }

    const text = fields.text?.[0] || "";
    const image = files.image?.[0];

    // setup twitter client
    const client = new Twitter({
      consumer_key: process.env.TWITTER_CONSUMER_KEY,
      consumer_secret: process.env.TWITTER_CONSUMER_SECRET,
      access_token_key: process.env.TWITTER_ACCESS_TOKEN_KEY,
      access_token_secret: process.env.TWITTER_ACCESS_TOKEN_SECRET,
    });

    try {
      let mediaId = null;

      if (image) {
        const data = fs.readFileSync(image.path);
        const media = await client.post("media/upload", { media: data });
        mediaId = media.media_id_string;
      }

      const params = { status: text };
      if (mediaId) params.media_ids = mediaId;

      const tweet = await client.post("statuses/update", params);
      return res.status(200).json({ success: true, tweet });
    } catch (twitterErr) {
      console.error("Twitter API error:", twitterErr);
      return res.status(500).json({ error: "Twitter API failed" });
    }
  });
          }
