const axios = require("axios");
const { getAccessToken } = require("../utils/gobiz-signature");

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  try {
    const { amount, orderId } = req.body;
    const token = await getAccessToken();

    const body = {
      partner_order_id: orderId,
      amount: {
        currency: "IDR",
        value: amount,
      },
    };

    const response = await axios.post(
      "https://api.partner-sandbox.gobiz.co.id/v1/orders", // ✅ Sandbox BASE_URL
      body,
      {
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
      }
    );

    res.status(200).json(response.data);
  } catch (err) {
    console.error("Error creating order:", err.response?.data || err.message);
    res.status(500).json({
      error: "Error creating order",
      details: err.response?.data || err.message,
    });
  }
};
