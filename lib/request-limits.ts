import { NextRequest, NextResponse } from "next/server";

export const MAX_MARKDOWN_BYTES = 512 * 1024;
export const MAX_JSON_REQUEST_BYTES = MAX_MARKDOWN_BYTES + 64 * 1024;

export function rejectOversizedRequest(
  request: NextRequest,
  maxBytes = MAX_JSON_REQUEST_BYTES
): NextResponse | null {
  const rawLength = request.headers.get("content-length");
  if (!rawLength) return null;

  const contentLength = Number(rawLength);
  if (!Number.isSafeInteger(contentLength) || contentLength < 0) {
    return NextResponse.json({ error: "Invalid Content-Length" }, { status: 400 });
  }

  if (contentLength > maxBytes) {
    return NextResponse.json({ error: "Request body too large" }, { status: 413 });
  }

  return null;
}

export function isMarkdownWithinLimit(markdown: unknown): markdown is string {
  return (
    typeof markdown === "string" &&
    markdown.trim().length > 0 &&
    Buffer.byteLength(markdown, "utf8") <= MAX_MARKDOWN_BYTES
  );
}
