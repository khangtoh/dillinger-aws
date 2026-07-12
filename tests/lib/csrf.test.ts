// @vitest-environment node

import { afterEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { enforceSameOrigin } from "@/lib/csrf";

const originalBaseUrl = process.env.NEXT_PUBLIC_BASE_URL;
const originalTrustedOrigins = process.env.DILLINGER_TRUSTED_ORIGINS;

afterEach(() => {
  if (originalBaseUrl === undefined) delete process.env.NEXT_PUBLIC_BASE_URL;
  else process.env.NEXT_PUBLIC_BASE_URL = originalBaseUrl;
  if (originalTrustedOrigins === undefined) delete process.env.DILLINGER_TRUSTED_ORIGINS;
  else process.env.DILLINGER_TRUSTED_ORIGINS = originalTrustedOrigins;
});

function request(origin?: string, marker = "same-origin") {
  const headers: Record<string, string> = { "x-dillinger-request": marker };
  if (origin) headers.origin = origin;

  return new NextRequest("https://internal.lambda-url.aws/api/github/save", {
    method: "POST",
    headers,
  });
}

describe("same-origin request enforcement", () => {
  it("accepts the configured public origin", () => {
    process.env.NEXT_PUBLIC_BASE_URL = "https://editor.example.com/path";
    expect(enforceSameOrigin(request("https://editor.example.com"))).toBeNull();
  });

  it("accepts an explicitly configured additional origin", () => {
    process.env.NEXT_PUBLIC_BASE_URL = "https://editor.example.com";
    process.env.DILLINGER_TRUSTED_ORIGINS = "https://direct.example.com";
    expect(enforceSameOrigin(request("https://direct.example.com"))).toBeNull();
  });

  it("rejects missing, untrusted, and unmarked requests", () => {
    process.env.NEXT_PUBLIC_BASE_URL = "https://editor.example.com";
    expect(enforceSameOrigin(request())?.status).toBe(403);
    expect(enforceSameOrigin(request("https://evil.example"))?.status).toBe(403);
    expect(enforceSameOrigin(request("https://editor.example.com", "wrong"))?.status).toBe(403);
  });
});
