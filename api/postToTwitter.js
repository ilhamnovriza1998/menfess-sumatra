import fetch from "node-fetch";

export default async function handler(req, res) {
  console.log("🔹 API postToTwitter dipanggil dengan method:", req.method);

  if (req.method !== "POST") {
    console.log("❌ Method tidak diizinkan:", req.method);
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { text, image } = req.body || {};
    console.log("📩 Data diterima dari frontend:", { textLength: text?.length, hasImage: !!image });

    if (!text && !image) {
      console.log("❌ Tidak ada teks atau gambar di body request");
      return res.status(400).json({ error: "Missing text or image" });
    }

    const bearerToken = process.env.TWITTER_BEARER_TOKEN;
    const accessToken = process.env.TWITTER_ACCESS_TOKEN;
    const accessSecret = process.env.TWITTER_ACCESS_SECRET;

    if (!bearerToken || !accessToken || !accessSecret) {
      console.log("❌ Kredensial Twitter tidak lengkap di Environment Variable");
      return res.status(500).json({ error: "Missing Twitter credentials" });
    }

    let mediaId = null;

    // 🖼 Upload gambar jika ada
    if (image) {
      console.log("📤 Mulai upload gambar ke Twitter...");
      try {
        const upload = await fetch("https://upload.twitter.com/1.1/media/upload.json", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${bearerToken}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            media_data: image.split(",")[1],
          }),
        });

        const uploadResult = await upload.json();
        console.log("📦 Respon upload Twitter:", uploadResult);

        if (uploadResult.media_id_string) {
          mediaId = uploadResult.media_id_string;
          console.log("✅ Gambar berhasil diupload. media_id:", mediaId);
        } else {
          console.log("❌ Upload gagal:", uploadResult);
          return res.status(500).json({ error: "Gagal upload gambar ke Twitter", detail: uploadResult });
        }
      } catch (uploadError) {
        console.error("🔥 ERROR saat upload gambar:", uploadError);
        return res.status(500).json({ error: "Gagal upload gambar", message: uploadError.message });
      }
    }

    // ✏️ Posting tweet
    const tweetBody = {
      text: text || "",
      ...(mediaId ? { media: { media_ids: [mediaId] } } : {}),
    };

    console.log("🚀 Mengirim tweet ke API Twitter v2:", tweetBody);

    const post = await fetch("https://api.twitter.com/2/tweets", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${bearerToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(tweetBody),
    });

    const result = await post.json();
    console.log("📬 Respon kirim tweet:", result);

    if (result.data) {
      console.log("✅ Tweet berhasil terkirim:", result.data);
      return res.status(200).json({ success: true, tweet: result.data });
    } else {
      console.log("❌ Gagal kirim tweet:", result);
      return res.status(500).json({ error: "Gagal mengirim tweet", detail: result });
    }

  } catch (err) {
    console.error("🔥 ERROR utama di server:", err);
    return res.status(500).json({ error: "Server error", message: err.message });
  }
}
