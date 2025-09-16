import express from "express";
import multer from "multer";
import Twitter from "twitter-lite";

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

const client = new Twitter({
  consumer_key: process.env.TWITTER_API_KEY,
  consumer_secret: process.env.TWITTER_API_SECRET,
  access_token_key: process.env.TWITTER_ACCESS_TOKEN,
  access_token_secret: process.env.TWITTER_ACCESS_SECRET,
});

app.post("/api/tweet", upload.single("image"), async (req, res) => {
  try {
    let mediaId = null;

    if (req.file) {
      const media = await client.post("media/upload", {
        media: req.file.buffer,
      });
      mediaId = media.media_id_string;
    }

    const tweet = await client.post("statuses/update", {
      status: req.body.text,
      media_ids: mediaId ? [mediaId] : undefined,
    });

    res.json({ success: true, tweet });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Gagal mengirim tweet." });
  }
});

export default app;
