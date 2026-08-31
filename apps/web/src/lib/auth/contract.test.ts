import { describe, expect, it } from "vitest";
import { AUTH_ERROR_MESSAGE, readPublicSupabaseEnv, safeNextPath, safeRequestOrigin } from "./contract";

describe("authentication contract", () => {
  it("permits only local application redirects", () => {
    expect(safeNextPath("/onboarding")).toBe("/onboarding");
    for (const value of ["https://evil.test", "//evil.test", "/\\evil", "/play\r\nLocation:x", ""]) expect(safeNextPath(value)).toBe("/play");
  });
  it("uses generic errors and safe public environment values", () => {
    expect(AUTH_ERROR_MESSAGE).not.toMatch(/user|account exists|password incorrect/i);
    expect(readPublicSupabaseEnv({ NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co", NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test" })).toEqual({ url: "https://example.supabase.co", publishableKey: "sb_publishable_test" });
    expect(() => readPublicSupabaseEnv({ NEXT_PUBLIC_SUPABASE_URL: "javascript:alert(1)", NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "x" })).toThrow("Invalid");
  });
  it("preserves allowed initiating origins for PKCE while rejecting untrusted origins", () => {
    expect(safeRequestOrigin("https://smashdroids.com")).toBe("https://smashdroids.com");
    expect(safeRequestOrigin("https://www.smashdroids.com/signup")).toBe("https://www.smashdroids.com");
    expect(safeRequestOrigin("http://localhost:3100")).toBe("http://localhost:3100");
    expect(safeRequestOrigin("https://evil.test")).toBe("https://smashdroids.com");
  });
});
