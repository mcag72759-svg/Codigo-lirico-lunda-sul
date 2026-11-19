import { describe, expect, it } from "vitest";
import { hasPermission } from "./permissions";

describe("hasPermission", () => {
  it("denies access when there is no authenticated administrator", () => {
    expect(hasPermission(null, "users.manage")).toBe(false);
  });

  it("denies access to inactive administrators", () => {
    expect(hasPermission({ active: false, permissions: ["users.manage"] }, "users.manage")).toBe(false);
  });

  it("grants only explicitly assigned permissions", () => {
    const admin = { active: true, permissions: ["content.review"] };
    expect(hasPermission(admin, "content.review")).toBe(true);
    expect(hasPermission(admin, "users.manage")).toBe(false);
  });

  it("honors the existing super-admin wildcard permission", () => {
    expect(hasPermission({ active: true, permissions: ["*"] }, "users.manage")).toBe(true);
  });

  it("denies an empty permission request", () => {
    expect(hasPermission({ active: true, permissions: ["*"] }, " ")).toBe(false);
  });
});
