// @vitest-environment node

import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { proxy } from "@/proxy";

describe("security proxy", () => {
  it("sets browser security headers with a per-request CSP nonce", () => {
    const first = proxy(new NextRequest("https://example.com/"));
    const second = proxy(new NextRequest("https://example.com/"));
    const firstCsp = first.headers.get("Content-Security-Policy");
    const secondCsp = second.headers.get("Content-Security-Policy");

    expect(firstCsp).toContain("default-src 'self'");
    expect(firstCsp).toContain("script-src 'self' 'nonce-");
    expect(firstCsp).toContain("frame-ancestors 'none'");
    expect(firstCsp).not.toBe(secondCsp);
    expect(first.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(first.headers.get("X-Frame-Options")).toBe("DENY");
  });

  it("marks API responses as non-cacheable", () => {
    const response = proxy(
      new NextRequest("https://example.com/api/github/status")
    );
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });
});
