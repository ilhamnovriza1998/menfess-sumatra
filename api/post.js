import multiparty from "multiparty";
import fs from "fs";
import Twitter from "twitter-lite";

const client = new Twitter({
  consumer_key: process.env.TWITTER_APP_KEY,
  consumer_secret: process.env.TWITTER_APP_SECRET,
  access_token_key: process.env.TWITTER_ACCESS_TOKEN,
  access_token_secret: process.env.TWITTER_ACCESS_SECRET,
});

export const config = {
  api: {
    bodyParser: false, // disable bawaan agar multiparty bisa parse form-data
  },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const form = new multiparty.Form();

  form.parse(req, async (err, fields, files) => {
    if (err) return res.status(500).json({ error: "Form parse error" });

    try {
      const text = fields.text?.[0] || "";
      let mediaId = null;

      // Upload media kalau ada file gambar
      if (files.image && files.image[0]) {
        const filePath = files.image[0].path;
        const mediaData = fs.readFileSync(filePath);
        const mediaUpload = await client.post("media/upload", {
          media: mediaData,
        });
        mediaId = mediaUpload.media_id_string;
      }

      // Posting tweet
      const params = { status: text };
      if (mediaId) {
        params.media_ids = mediaId;
      }

      await client.post("statuses/update", params);

      res.json({ success: true, message: "Tweet berhasil diposting" });
    } catch (error) {
      console.error("Error posting tweet:", error);
      res.status(500).json({ error: "Gagal posting tweet" });
    }
  });
}
