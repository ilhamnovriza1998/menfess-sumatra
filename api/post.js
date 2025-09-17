// api/post.js
import fs from "fs";
import multiparty from "multiparty";
import Twitter from "twitter-lite";

const client_v1 = new Twitter({
  consumer_key: process.env.TWITTER_CONSUMER_KEY,
  consumer_secret: process.env.TWITTER_CONSUMER_SECRET,
  access_token_key: process.env.TWITTER_ACCESS_TOKEN,
  access_token_secret: process.env.TWITTER_ACCESS_SECRET,
  version: "1.1",
});

// 🔑 pakai OAuth 1.0a user context untuk v2
const client_v2 = new Twitter({
  consumer_key: process.env.TWITTER_CONSUMER_KEY,
  consumer_secret: process.env.TWITTER_CONSUMER_SECRET,
  access_token_key: process.env.TWITTER_ACCESS_TOKEN,
  access_token_secret: process.env.TWITTER_ACCESS_SECRET,
  version: "2",
});

export default function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const form = new multiparty.Form();

  form.parse(req, async (err, fields, files) => {
    if (err) return res.status(500).json({ error: "Form parse error" });

    try {
      const text = fields.text?.[0] || "";
      let media_id = null;

      if (files.image && files.image[0] && files.image[0].size > 0) {
        try {
          const filePath = files.image[0].path;
          const mediaData = fs.readFileSync(filePath);
          const mediaUpload = await client_v1.post("media/upload", {
            media: mediaData,
          });
          media_id = mediaUpload.media_id_string;
        } catch (uploadErr) {
          console.error("Upload error:", uploadErr);
        }
      }

      const payload = media_id
        ? { text, media: { media_ids: [media_id] } }
        : { text };

      // 🚀 Sekarang pakai OAuth 1.0a, bukan bearer
      const tweet = await client_v2.post("tweets", payload);

      return res.status(200).json({ success: true, tweet });
    } catch (error) {
      console.error("Handler/Twitter error:", error);
      return res
        .status(500)
        .json({ error: error.message || "Twitter error" });
    }
  });
}

export const config = {
  api: {
    bodyParser: false,
  },
};
