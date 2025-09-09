import crypto from "crypto";

export function generateSignature(body, secret) {
  if (!secret) {
    throw new Error("❌ GOBIZ_ORDER_RELAY_SECRET is missing. Check your env vars.");
  }

  const payload = typeof body === "string" ? body : JSON.stringify(body);

  return crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex");
}
