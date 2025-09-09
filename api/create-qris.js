import axios from "axios";
import { generateSignature } from "../utils/gobiz-signature.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  try {
    const orderId = `menfess-${Date.now()}`;
    const grossAmount = 5000;

    // 👇 body sesuai format GoBiz API
    const body = {
      partner_tx_id: orderId,
      partner_id: process.env.GOBIZ_PARTNER_ID,
      payment_amount: grossAmount,
      payment_method: "QRIS",
      currency: "IDR",
      callback_url: `${process.env.BASE_URL}/api/callback`
    };

    // Buat signature
    const signature = generateSignature(body, process.env.GOBIZ_ORDER_RELAY_SECRET);

    // 🔗 GoBiz Sandbox endpoint
    const response = await axios.post(
      "https://api-sandbox.partner.gopayapi.com/v1/orders",
      body,
      {
        headers: {
          "Content-Type": "application/json",
          "X-App-Id": process.env.GOBIZ_APP_ID,
          "X-Signature": signature,
        },
      }
    );

    return res.status(200).json({
      success: true,
      data: response.data,
    });
  } catch (error) {
    console.error("Error creating order:", error.response?.data || error.message);
    return res.status(500).json({
      success: false,
      message: "Gagal membuat QRIS.",
      error: error.response?.data || error.message,
    });
  }
}
