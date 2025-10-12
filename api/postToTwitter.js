export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    console.log("🔹 API postToTwitter dipanggil (v1.1)");

    const form = new IncomingForm({ multiples: false, uploadDir: "/tmp", keepExtensions: true });

    form.parse(req, async (err, fields, files) => {
      if (err) return res.status(500).json({ error: "Form parse error" });

      const status = fields.text?.toString() || "";
      const imagePath = files.image?.filepath;

      if (!status) return res.status(400).json({ error: "Teks tidak boleh kosong" });

      const consumer_key = process.env.TWITTER_API_KEY;
      const consumer_secret = process.env.TWITTER_API_KEY_SECRET;
      const access_token = process.env.TWITTER_ACCESS_TOKEN;
      const access_token_secret = process.env.TWITTER_ACCESS_TOKEN_SECRET;

      if (!consumer_key || !consumer_secret || !access_token || !access_token_secret) {
        return res.status(500).json({ error: "Token Twitter belum lengkap di Environment Variables" });
      }

      try {
        let media_id = null;
        if (imagePath) {
          const imageData = fs.readFileSync(imagePath);
          const uploadResult = await twitterRequest(
            "https://upload.twitter.com/1.1/media/upload.json",
            consumer_key,
            consumer_secret,
            access_token,
            access_token_secret,
            "POST",
            {},
            { media: imageData.toString("base64") }
          );
          media_id = uploadResult.media_id_string;
          console.log("📸 Media diupload:", media_id);
        }

        const params = { status };
        if (media_id) params.media_ids = media_id;

        const tweetResult = await twitterRequest(
          "https://api.twitter.com/1.1/statuses/update.json",
          consumer_key,
          consumer_secret,
          access_token,
          access_token_secret,
          "POST",
          params
        );

        console.log("✅ Tweet sukses:", tweetResult);
        return res.status(200).json({ success: true, tweet: tweetResult });
      } catch (apiError) {
        console.error("🔥 API ERROR:", JSON.stringify(apiError, null, 2));
        return res.status(500).json({ error: apiError });
      }
    });
  } catch (error) {
    console.error("🔥 FATAL ERROR:", error);
    return res.status(500).json({ error: error.message || "Unknown error" });
  }
}
