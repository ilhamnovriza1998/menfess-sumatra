import multiparty from "multiparty";
import fs from "fs";
import Twitter from "twitter-lite";

export const config = {
  api: {
    bodyParser: false
  }
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const form = new multiparty.Form();

  form.parse(req, async (err, fields, files) => {
    if (err) {
      console.error("Form parse error:", err);
      return res.status(400).json({ error: "Form parse failed" });
    }

    try {
      const text = (fields.text && fields.text[0]) || "";

      // create twitter client (v1.1)
      const client = new Twitter({
        consumer_key: process.env.TWITTER_CONSUMER_KEY,
        consumer_secret: process.env.TWITTER_CONSUMER_SECRET,
        access_token_key: process.env.TWITTER_ACCESS_TOKEN,
        access_token_secret: process.env.TWITTER_ACCESS_SECRET,
      });

      let params = { status: text };

      // if image provided -> upload media then add media_ids
      if (files.image && files.image[0] && files.image[0].path) {
        const imgPath = files.image[0].path;
        const buf = fs.readFileSync(imgPath);
        const b64 = buf.toString("base64");

        // media/upload expects 'media_data' (base64) for twitter-lite
        const mediaRes = await client.post("media/upload", { media_data: b64 });
        const mediaId = mediaRes && mediaRes.media_id_string;
        if (mediaId) params.media_ids = mediaId;

        // optional: delete tmp file (Vercel cleans tmp but we try)
        try { fs.unlinkSync(imgPath); } catch (e) { /* ignore */ }
      }

      const tweet = await client.post("statuses/update", params);

      return res.status(200).json({ success: true, tweet });
    } catch (e) {
      console.error("Handler/Twitter error:", e);
      // Return error message (but don't leak secrets)
      return res.status(500).json({ error: e.message || "Twitter API error" });
    }
  });
}
