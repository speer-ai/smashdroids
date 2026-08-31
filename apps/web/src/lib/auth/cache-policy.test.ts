import { describe, expect, it } from "vitest";
import { applyPrivateAuthCachePolicy, privateAuthCacheHeaders } from "./cache-policy";

describe("authenticated response cache policy", () => {
  it("forbids shared and browser caching", () => {
    expect(privateAuthCacheHeaders()).toEqual({
      "Cache-Control": "private, no-cache, no-store, must-revalidate, max-age=0",
      Expires: "0",
      Pragma: "no-cache",
    });
  });

  it("writes every private header onto a response", () => {
    const response = new Response();
    expect(applyPrivateAuthCachePolicy(response)).toBe(response);
    expect(response.headers.get("Cache-Control")).toBe("private, no-cache, no-store, must-revalidate, max-age=0");
    expect(response.headers.get("Expires")).toBe("0");
    expect(response.headers.get("Pragma")).toBe("no-cache");
  });
});
