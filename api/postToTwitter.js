import { formidable } from "formidable";
import fs from "fs";
import fetch from "node-fetch";

export const config = {
  api: {
    bodyParser: false, // wajib untuk handle FormData
  },
};

export default async function handler(req, res) {
  console.log("🔹 API postToTwitter dipanggil:", req.method);

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const form = formidable({ multiples: false }); // ✅ versi baru

  form.parse(req, async (err, fields, files) => {
    if (err) {
      console.error("❌ Error parsing form:", err);
      return res.status(400).json({ error: "Error parsing form data" });
    }

    const text = fields.text?.[0] || fields.text || "";
    const file = files.image?.[0] || files.image;

    console.log("📩 Data diterima:", { text, hasFile: !!file });

    if (!text && !file) {
      return res.status(400).json({ error: "Missing text or image" });
    }

    const bearerToken = process.env.TWITTER_BEARER_TOKEN;
    if (!bearerToken) {
      console.error("❌ Missing TWITTER_BEARER_TOKEN");
      return res.status(500).json({ error: "Missing Twitter credentials" });
    }

    let mediaId = null;

    try {
      // 🖼️ Upload gambar jika ada
      if (file && file.filepath) {
        console.log("📤 Upload gambar...");
        const imageData = fs.readFileSync(file.filepath);
        const base64 = imageData.toString("base64");

        const upload = await fetch("https://upload.twitter.com/1.1/media/upload.json", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${bearerToken}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({ media_data: base64 }),
        });

        const uploadResult = await upload.json();
        console.log("📦 Hasil upload:", uploadResult);

        if (uploadResult.media_id_string) {
          mediaId = uploadResult.media_id_string;
        } else {
          throw new Error("Upload gambar gagal: " + JSON.stringify(uploadResult));
        }
      }

      // 📝 Kirim tweet
      const body = mediaId
        ? { text, media: { media_ids: [mediaId] } }
        : { text };

      console.log("🚀 Kirim tweet:", body);

      const tweetRes = await fetch("https://api.twitter.com/2/tweets", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${bearerToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      const result = await tweetRes.json();
      console.log("📬 Respon Twitter:", result);

      if (result.data) {
        return res.status(200).json({ success: true, tweet: result.data });
      } else {
        throw new Error(JSON.stringify(result));
      }
    } catch (error) {
      console.error("🔥 ERROR:", error);
      return res.status(500).json({ error: error.message });
    }
  });
}
