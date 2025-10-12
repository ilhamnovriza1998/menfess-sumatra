const crypto = require("crypto");
const fs = require("fs");
const https = require("https");
const formidable = require("formidable");

exports.config = {
  api: { bodyParser: false },
};

exports.default = async function handler(req, res) {
  console.log("🔹 API postToTwitter dipanggil (fixed)");

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // gunakan cara lama (v2/v3 compatible)
    const form = new formidable.IncomingForm({ multiples: false, uploadDir: "/tmp", keepExtensions: true });

    form.parse(req, async (err, fields, files) => {
      if (err) {
        console.error("❌ Form parse error:", err);
        return res.status(500).json({ error: "Form parse error", detail: err.message });
      }

      const status = fields.text || fields.status || "";
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
        return res.status(500).json({ error: "Missing Twitter credentials" });
      }

      // === Upload media jika ada ===
      let media_id = null;
      if (imagePath) {
        console.log("📤 Uploading media...");
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
        if (uploadResult && uploadResult.media_id_string) {
          media_id = uploadResult.media_id_string;
          console.log("✅ media_id:", media_id);
        } else {
          console.warn("⚠️ Upload gagal:", uploadResult);
        }
      }

      // === Posting status ===
      const params = { status };
      if (media_id) params.media_ids = media_id;

      console.log("🚀 Posting status...");

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
    });
  } catch (fatalErr) {
    console.error("🔥 FATAL ERROR:", fatalErr);
    return res.status(500).json({ error: fatalErr.message || "Unknown error" });
  }
};

// ==== Helper untuk request Twitter API (OAuth 1.0a manual) ====
function twitterRequest(url, consumer_key, consumer_secret, token, token_secret, method = "GET", params = {}, body = null) {
  const oauth = {
    oauth_consumer_key: consumer_key,
    oauth_nonce: crypto.randomBytes(16).toString("hex"),
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_token: token,
    oauth_version: "1.0",
  };

  const allParams = { ...params, ...oauth };
  const sortedKeys = Object.keys(allParams).sort();
  const paramString = sortedKeys.map(k => `${encodeURIComponent(k)}=${encodeURIComponent(allParams[k])}`).join("&");

  const baseString = `${method.toUpperCase()}&${encodeURIComponent(url)}&${encodeURIComponent(paramString)}`;
  const signingKey = `${encodeURIComponent(consumer_secret)}&${encodeURIComponent(token_secret || "")}`;
  oauth.oauth_signature = crypto.createHmac("sha1", signingKey).update(baseString).digest("base64");

  const authHeader = "OAuth " + Object.keys(oauth)
    .map(k => `${encodeURIComponent(k)}="${encodeURIComponent(oauth[k])}"`)
    .join(", ");

  const u = new URL(url);
  const options = {
    hostname: u.hostname,
    path: u.pathname + (u.search || ""),
    method: method.toUpperCase(),
    headers: {
      Authorization: authHeader,
    },
  };

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
          if (parsed.errors) return reject(parsed);
          resolve(parsed);
        } catch (err) {
          reject({ message: "Invalid JSON", raw: data });
        }
      });
    });

    req.on("error", (err) => reject(err));
    if (postData) req.write(postData);
    req.end();
  });
               }
