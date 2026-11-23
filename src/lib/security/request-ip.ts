import { createHmac } from "node:crypto";

/** Creates a keyed, non-plaintext identifier for request rate limiting. */
export function requestIpHash(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = request.headers.get("x-real-ip")?.trim() || forwarded || "unknown";
  const key = process.env.IP_HASH_SECRET || process.env.DATABASE_URL || "codigo-lirico-test-only";
  return createHmac("sha256", key).update(ip).digest("hex");
}
