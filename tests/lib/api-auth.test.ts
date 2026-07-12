// @vitest-environment node

import { afterEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { validateApiKey } from "@/lib/api-auth";

const originalApiKey = process.env.DILLINGER_API_KEY;

afterEach(() => {
  if (originalApiKey === undefined) {
    delete process.env.DILLINGER_API_KEY;
  } else {
    process.env.DILLINGER_API_KEY = originalApiKey;
  }
});

function request(token?: string) {
  return new NextRequest("https://example.com/api/v1/render", {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
}

describe("API key validation", () => {
  it("accepts an exact key and rejects a different key", () => {
    process.env.DILLINGER_API_KEY = "a-long-random-test-key";
    expect(validateApiKey(request("a-long-random-test-key"))).toBeNull();
    expect(validateApiKey(request("a-long-random-test-kez"))?.status).toBe(403);
  });

  it("fails closed when the API key is not configured", () => {
    delete process.env.DILLINGER_API_KEY;
    expect(validateApiKey(request("anything"))?.status).toBe(503);
  });
});
