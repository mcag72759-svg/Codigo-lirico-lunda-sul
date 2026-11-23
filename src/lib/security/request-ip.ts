import { createHash } from "node:crypto";

/** Returns a stable, non-reversible hash of the request IP for rate limiting. */
export function requestIpHash(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = request.headers.get("x-real-ip")?.trim() || forwarded || "unknown";
  return createHash("sha256").update(ip).digest("hex");
}
