import axios from "axios";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  const signatureKey = process.env.GOBIZ_ORDER_RELAY_SECRET;
  const signature = req.headers["x-signature"]; // header dari GoBiz
  const bodyString = JSON.stringify(req.body);

  // 🔒 Verifikasi tanda tangan
  const hmac = crypto.createHmac("sha256", signatureKey).update(bodyString).digest("hex");

  if (hmac !== signature) {
    console.error("❌ Tanda tangan webhook tidak valid.");
    return res.status(403).json({ message: "Unauthorized Request" });
  }

  const { partner_tx_id, payment_status } = req.body;

  // --- Jika pembayaran sukses ---
  if (payment_status === "COMPLETED") {
    console.log(`✅ Pembayaran untuk Order ID ${partner_tx_id} berhasil.`);

    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY
    );

    try {
      // 1. Ambil data menfess dari Supabase
      const { data: menfessData, error: fetchError } = await supabase
        .from("menfess_posts")
        .select("content")
        .eq("order_id", partner_tx_id)
        .single();

      if (fetchError) throw fetchError;

      const menfessContent = menfessData.content;

      // 2. Update status menfess → POSTED
      const { error: updateError } = await supabase
        .from("menfess_posts")
        .update({ status: "POSTED" })
        .eq("order_id", partner_tx_id);

      if (updateError) throw updateError;

      // 3. Post menfess ke Twitter (X)
      const twitterPostUrl = "https://api.twitter.com/2/tweets";
      const twitterBearerToken = process.env.TWITTER_BEARER_TOKEN;

      await axios.post(
        twitterPostUrl,
        { text: menfessContent },
        {
          headers: {
            Authorization: `Bearer ${twitterBearerToken}`,
            "Content-Type": "application/json",
          }
        }
      );

      console.log("🚀 Menfess berhasil diposting ke Twitter.");
      return res.status(200).json({ message: "Pembayaran berhasil & menfess diposting." });

    } catch (error) {
      console.error("⚠️ Gagal memproses webhook:", error.message);
      return res.status(500).json({ message: "Gagal memproses menfess." });
    }
  } else {
    // Jika status pembayaran bukan COMPLETED
    console.log(`ℹ️ Status order ${partner_tx_id}: ${payment_status}`);
    return res.status(200).json({ message: "Status pembayaran tidak memerlukan aksi." });
  }
}
