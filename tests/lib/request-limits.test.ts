// @vitest-environment node

import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import {
  MAX_JSON_REQUEST_BYTES,
  MAX_MARKDOWN_BYTES,
  isMarkdownWithinLimit,
  rejectOversizedRequest,
} from "@/lib/request-limits";

describe("request limits", () => {
  it("rejects declared request bodies above the limit", () => {
    const request = new NextRequest("https://example.com/api/export/pdf", {
      method: "POST",
      headers: { "content-length": String(MAX_JSON_REQUEST_BYTES + 1) },
    });
    expect(rejectOversizedRequest(request)?.status).toBe(413);
  });

  it("bounds markdown by UTF-8 byte length", () => {
    expect(isMarkdownWithinLimit("# Valid")).toBe(true);
    expect(isMarkdownWithinLimit("")).toBe(false);
    expect(isMarkdownWithinLimit("a".repeat(MAX_MARKDOWN_BYTES + 1))).toBe(false);
  });
});
