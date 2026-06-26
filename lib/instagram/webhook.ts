import crypto from "crypto";

export function verifyHmacSignature(rawBody: string, header: string): boolean {
  if (!header || !header.startsWith("sha256=")) return false;
  const expected = crypto
    .createHmac("sha256", process.env.INSTAGRAM_APP_SECRET || "")
    .update(rawBody, "utf-8")
    .digest("hex");

  const provided = header.replace("sha256=", "");
  
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(provided));
  } catch {
    return false;
  }
}
