import { describe, expect, it } from "vitest";
import { requestIpHash } from "./request-ip";

describe("requestIpHash", () => {
  it("hashes the first forwarded IP address", () => {
    const request = new Request("https://example.test", { headers: { "x-forwarded-for": "192.0.2.10, 198.51.100.4" } });
    expect(requestIpHash(request)).toMatch(/^[a-f0-9]{64}$/);
    expect(requestIpHash(request)).toBe(requestIpHash(new Request("https://example.test", { headers: { "x-forwarded-for": "192.0.2.10" } })));
  });

  it("prefers the platform real-IP header", () => {
    const request = new Request("https://example.test", { headers: { "x-real-ip": "203.0.113.7", "x-forwarded-for": "192.0.2.10" } });
    expect(requestIpHash(request)).toBe(requestIpHash(new Request("https://example.test", { headers: { "x-real-ip": "203.0.113.7" } })));
  });

  it("uses a stable fallback when no IP header is present", () => {
    const request = new Request("https://example.test");
    expect(requestIpHash(request)).toBe(requestIpHash(new Request("https://other.test")));
  });
});
