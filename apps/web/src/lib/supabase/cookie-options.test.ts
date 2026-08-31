import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { stringifySetCookie } from "cookie";
import { applySupabaseCookiePolicy, supabaseCookieOptions } from "./cookie-options";

const read = (path: string) => readFileSync(resolve(import.meta.dirname, path), "utf8");

describe("Supabase SSR cookie policy", () => {
  it("requires HTTPS-only production cookies with a bounded lifetime", () => {
    expect(supabaseCookieOptions(true)).toMatchObject({ secure: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 30 });
  });

  it("overrides the library's long session lifetime while preserving deletion", () => {
    expect(applySupabaseCookiePolicy({ maxAge: 60 * 60 * 24 * 400 }, true).maxAge).toBe(60 * 60 * 24 * 30);
    expect(applySupabaseCookiePolicy({ maxAge: 0 }, true).maxAge).toBe(0);
    expect(applySupabaseCookiePolicy({}, true).secure).toBe(true);
    const serialized = stringifySetCookie({ name: "sb-session", value: "token", ...applySupabaseCookiePolicy({ maxAge: 60 * 60 * 24 * 400 }, true) });
    expect(serialized).toContain("Max-Age=2592000");
    expect(serialized).toContain("Path=/");
    expect(serialized).toContain("Secure");
    expect(serialized).toContain("SameSite=Lax");
  });

  it("applies the same policy to browser, server, and proxy clients", () => {
    expect(read("client.ts")).toContain("cookieOptions: supabaseCookieOptions()");
    expect(read("server.ts")).toContain("cookieOptions: supabaseCookieOptions()");
    expect(read("../../proxy.ts")).toContain("cookieOptions: supabaseCookieOptions()");
  });

  it("permits local HTTP development without weakening production", () => {
    expect(supabaseCookieOptions(false).secure).toBe(false);
  });
});
