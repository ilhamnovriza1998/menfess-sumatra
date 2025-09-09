import crypto from "crypto";

export function generateSignature(body, secret) {
  // Body harus string (JSON stringify)
  const payload = typeof body === "string" ? body : JSON.stringify(body);

  return crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex");
}
