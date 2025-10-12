import crypto from "crypto";
import fs from "fs";
import https from "https";
import { formidable } from "formidable"; // => gunakan versi baru
// no IncomingForm usage

export const config = {
  api: { bodyParser: false },
};

export default async function handler(req, res) {
  console.log("🔹 API postToTwitter dipanggil (v1.1)");

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // buat form parser (formidable v3+)
    const form = formidable({ multiples: false, uploadDir: "/tmp", keepExtensions: true });

    form.parse(req, async (err, fields, files) => {
      if (err) {
        console.error("❌ Form parse error:", err);
        return res.status(500).json({ error: "Form parse error", detail: err.message });
      }

      // ambil text dan file
      const status = (fields.text && String(fields.text)) || (fields.status && String(fields.status)) || "";
      const file = files.image || files.media || null;
      const imagePath = file?.filepath || file?.path || null;

      console.log("📩 Received:", { statusLength: status.length, hasFile: !!imagePath });

      if (!status) {
        return res.status(400).json({ error: "Teks tidak boleh kosong" });
      }

      // ambil kredensial dari env
      const consumer_key = process.env.TWITTER_API_KEY;
      const consumer_secret = process.env.TWITTER_API_KEY_SECRET;
      const access_token = process.env.TWITTER_ACCESS_TOKEN;
      const access_token_secret = process.env.TWITTER_ACCESS_TOKEN_SECRET;

      if (!consumer_key || !consumer_secret || !access_token || !access_token_secret) {
        console.error("❌ Missing twitter env keys");
        return res.status(500).json({ error: "Missing Twitter credentials in environment variables" });
      }

      try {
        // STEP: upload media (jika ada)
        let media_id = null;
        if (imagePath) {
          console.log("📤 Uploading media from:", imagePath);
          const imageData = fs.readFileSync(imagePath);
          const uploadResult = await twitterRequest(
            "https://upload.twitter.com/1.1/media/upload.json",
            consumer_key,
            consumer_secret,
            access_token,
            access_token_secret,
            "POST",
            {}, // query params
            { media: imageData.toString("base64") } // body (form-urlencoded)
          );
          console.log("📦 Upload result:", uploadResult);
          if (uploadResult && uploadResult.media_id_string) {
            media_id = uploadResult.media_id_string;
            console.log("✅ media_id:", media_id);
          } else {
            console.warn("⚠️ Upload mungkin gagal:", uploadResult);
            // lanjutkan tanpa media atau return error tergantung kebutuhan
          }
        }

        // STEP: post status
        const params = { status };
        if (media_id) params.media_ids = media_id;

        console.log("🚀 Posting status:", { statusLength: status.length, hasMedia: !!media_id });

        const tweetResult = await twitterRequest(
          "https://api.twitter.com/1.1/statuses/update.json",
          consumer_key,
          consumer_secret,
          access_token,
          access_token_secret,
          "POST",
          params
        );

        console.log("✅ Tweet result:", tweetResult);
        return res.status(200).json({ success: true, tweet: tweetResult });
      } catch (apiErr) {
        console.error("🔥 API ERROR (twitter):", JSON.stringify(apiErr, null, 2));
        return res.status(500).json({ error: "Twitter API error", detail: apiErr });
      }
    });
  } catch (fatalErr) {
    console.error("🔥 FATAL ERROR:", fatalErr);
    return res.status(500).json({ error: fatalErr.message || "Unknown error" });
  }
}

// Helper OAuth 1.0a request (simple)
async function twitterRequest(url, consumer_key, consumer_secret, token, token_secret, method = "GET", params = {}, body = null) {
  // prepare oauth params
  const oauth = {
    oauth_consumer_key: consumer_key,
    oauth_nonce: crypto.randomBytes(16).toString("hex"),
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_token: token,
    oauth_version: "1.0",
  };

  // merge params and oauth for signature base string
  const allParams = { ...params, ...oauth };
  // if body has fields (like media), include them in base string as well (we already send as form-urlencoded)
  const sortedKeys = Object.keys(allParams).sort();
  const paramString = sortedKeys.map(k => `${encodeURIComponent(k)}=${encodeURIComponent(allParams[k])}`).join("&");

  const baseString = `${method.toUpperCase()}&${encodeURIComponent(url)}&${encodeURIComponent(paramString)}`;
  const signingKey = `${encodeURIComponent(consumer_secret)}&${encodeURIComponent(token_secret || "")}`;
  oauth.oauth_signature = crypto.createHmac("sha1", signingKey).update(baseString).digest("base64");

  const authHeader = "OAuth " + Object.keys(oauth)
    .map(k => `${encodeURIComponent(k)}="${encodeURIComponent(oauth[k])}"`)
    .join(", ");

  // build request options
  const u = new URL(url);
  const options = {
    hostname: u.hostname,
    path: u.pathname + (u.search || ""),
    method: method.toUpperCase(),
    headers: {
      Authorization: authHeader,
    },
  };

  // if body provided, we send as application/x-www-form-urlencoded
  let postData = null;
  if (body) {
    postData = new URLSearchParams(body).toString();
    options.headers["Content-Type"] = "application/x-www-form-urlencoded";
    options.headers["Content-Length"] = Buffer.byteLength(postData);
  } else if (method.toUpperCase() === "POST" && Object.keys(params).length) {
    postData = new URLSearchParams(params).toString();
    options.headers["Content-Type"] = "application/x-www-form-urlencoded";
    options.headers["Content-Length"] = Buffer.byteLength(postData);
  }

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.errors) {
            // return error object
            return reject(parsed);
          }
          resolve(parsed);
        } catch (err) {
          return reject({ message: "Invalid JSON from twitter", raw: data });
        }
      });
    });

    req.on("error", (
