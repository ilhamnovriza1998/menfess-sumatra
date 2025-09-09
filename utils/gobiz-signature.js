const axios = require("axios");

let cachedToken = null;
let tokenExpiry = null;

async function getAccessToken() {
  // kalau token masih valid, pakai ulang
  if (cachedToken && tokenExpiry && new Date() < tokenExpiry) {
    return cachedToken;
  }

  try {
    const response = await axios.post(
      "https://integration-goauth.gojekapi.com/token", // ✅ Sandbox OAuth URL
      new URLSearchParams({
        grant_type: "client_credentials",
        client_id: process.env.GOBIZ_CLIENT_ID,
        client_secret: process.env.GOBIZ_CLIENT_SECRET,
      }),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    const { access_token, expires_in } = response.data;

    cachedToken = access_token;
    tokenExpiry = new Date(Date.now() + expires_in * 1000);

    return access_token;
  } catch (err) {
    console.error("Failed to get access token:", err.response?.data || err.message);
    throw new Error("OAuth token request failed");
  }
}

module.exports = { getAccessToken };
