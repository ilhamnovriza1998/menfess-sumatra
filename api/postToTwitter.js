import crypto from "crypto";
import fs from "fs";
import https from "https";
import path from "path";
import { IncomingForm } from "formidable";

export const config = {
  api: { bodyParser: false },
};

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

      // ==== STEP 1: kredensial Twitter ====
      const consumer_key = process.env.TWITTER_API_KEY;
      const consumer_secret = process.env.TWITTER_API_KEY_SECRET;
      const access_token = process.env.TWITTER_ACCESS_TOKEN;
      const access_token_secret = process.env.TWITTER_ACCESS_TOKEN_SECRET;

      if (!consumer_key || !consumer_secret || !access_token || !access_token_secret) {
        return res.status(500).json({ error: "Token Twitter belum lengkap di Environment Variables" });
      }

      // ==== STEP 2: Upload media (kalau ada gambar) ====
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

      // ==== STEP 3: Kirim tweet ====
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
    });
  } catch (error) {
    console.error("🔥 ERROR:", error);
    res.status(500).json({ error: error.message });
  }
}

// 🔧 Helper untuk membuat request OAuth 1.0a
async function twitterRequest(url, consumer_key, consumer_secret, token, token_secret, method, params = {}, body = null) {
  const oauth = {
    oauth_consumer_key: consumer_key,
    oauth_nonce: crypto.randomBytes(32).toString("base64"),
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: Math.floor(Date.now() / 1000),
    oauth_token: token,
    oauth_version: "1.0",
  };

  const allParams = { ...params, ...oauth };
  const sorted = Object.keys(allParams).sort().map(k => `${encodeURIComponent(k)}=${encodeURIComponent(allParams[k])}`).join("&");
  const baseString = `${method.toUpperCase()}&${encodeURIComponent(url)}&${encodeURIComponent(sorted)}`;
  const signingKey = `${encodeURIComponent(consumer_secret)}&${encodeURIComponent(token_secret)}`;
  oauth.oauth_signature = crypto.createHmac("sha1", signingKey).update(baseString).digest("base64");

  const authHeader =
    "OAuth " +
    Object.keys(oauth)
      .map(k => `${encodeURIComponent(k)}="${encodeURIComponent(oauth[k])}"`)
      .join(", ");

  const options = new URL(url);
  options.method = method;
  options.headers = {
    Authorization: authHeader,
    "Content-Type": body ? "application/x-www-form-urlencoded" : undefined,
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.errors) return reject(parsed);
          resolve(parsed);
        } catch (err) {
          reject(err);
        }
      });
    });

    req.on("error", reject);
    if (body) req.write(new URLSearchParams(body).toString());
    req.end();
  });
          }
