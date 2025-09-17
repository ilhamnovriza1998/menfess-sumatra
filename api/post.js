import Twitter from "twitter-lite";
import multiparty from "multiparty";

const clientV1 = new Twitter({
  consumer_key: process.env.TWITTER_CONSUMER_KEY,
  consumer_secret: process.env.TWITTER_CONSUMER_SECRET,
  access_token_key: process.env.TWITTER_ACCESS_TOKEN,
  access_token_secret: process.env.TWITTER_ACCESS_SECRET,
  version: "1.1"
});

const clientV2 = new Twitter({
  bearer_token: process.env.TWITTER_BEARER_TOKEN,
  version: "2"
});

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
    const form = new multiparty.Form();
    form.parse(req, async (err, fields, files) => {
      if (err) return res.status(500).json({ error: "Form parse error" });

      const text = fields.text ? fields.text[0] : "";
      let mediaId = null;

      // ✅ Hanya upload gambar kalau ada
      if (files.image && files.image[0] && files.image[0].path) {
        const fs = await import("fs");
        const data = fs.readFileSync(files.image[0].path);

        const media = await clientV1.post("media/upload", {
          media_data: data.toString("base64"),
        });

        mediaId = media.media_id_string;
      }

      let body = { text };
      if (mediaId) {
        body.media = { media_ids: [mediaId] };
      }

      const tweetRes = await clientV2.post("tweets", body);

      return res.status(200).json({
        success: true,
        tweet: tweetRes,
      });
    });
  } catch (error) {
    console.error("Handler/Twitter error:", error);
    return res.status(500).json({ error: error.message });
  }
}
