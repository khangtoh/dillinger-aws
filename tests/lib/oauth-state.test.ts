// @vitest-environment node

import { describe, expect, it } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import {
  createOAuthState,
  hasValidOAuthState,
  oauthCallbackRedirect,
  setOAuthStateCookie,
} from "@/lib/oauth-state";

describe("OAuth state", () => {
  it("creates high-entropy URL-safe values", () => {
    const first = createOAuthState();
    const second = createOAuthState();

    expect(first).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(second).not.toBe(first);
  });

  it("accepts an exact state and rejects missing or different state", () => {
    const valid = new NextRequest("https://example.com/api/github/callback?state=expected", {
      headers: { cookie: "oauth_state_github=expected" },
    });
    const wrong = new NextRequest("https://example.com/api/github/callback?state=wrong", {
      headers: { cookie: "oauth_state_github=expected" },
    });
    const missing = new NextRequest("https://example.com/api/github/callback");

    expect(hasValidOAuthState(valid, "github")).toBe(true);
    expect(hasValidOAuthState(wrong, "github")).toBe(false);
    expect(hasValidOAuthState(missing, "github")).toBe(false);
  });

  it("uses provider-scoped, short-lived HttpOnly cookies and clears them", () => {
    const response = NextResponse.redirect("https://example.com/");
    setOAuthStateCookie(response, "github", "state");

    const setCookie = response.headers.get("set-cookie");
    expect(setCookie).toContain("oauth_state_github=state");
    expect(setCookie).toContain("HttpOnly");
    expect(setCookie).toContain("SameSite=lax");
    expect(setCookie).toContain("Path=/api/github/callback");
    expect(setCookie).toContain("Max-Age=600");

    const cleared = oauthCallbackRedirect("https://example.com/", "github");
    expect(cleared.headers.get("set-cookie")).toContain("Max-Age=0");
  });
});
