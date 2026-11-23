import { describe, expect, it } from "vitest";
import { normalizePhone, phoneDigits } from "./phone";

describe("artist phone normalization", () => {
  it("adds Angola country code to a local nine-digit number", () => {
    expect(normalizePhone("923 456 789")).toBe("+244923456789");
  });

  it("accepts an international number with country prefix", () => {
    expect(normalizePhone("+244 923-456-789")).toBe("+244923456789");
  });

  it("accepts an international 00 prefix", () => {
    expect(normalizePhone("00244 923 456 789")).toBe("+244923456789");
  });

  it("rejects numbers outside the E.164 digit range", () => {
    expect(normalizePhone("1234")).toBe("");
    expect(normalizePhone("1234567890123456")).toBe("");
  });

  it("returns stable digits for database lookups", () => {
    expect(phoneDigits("+244 923-456-789")).toBe("244923456789");
  });
});
