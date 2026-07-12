import { NextResponse } from "next/server";

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

export function enforceRateLimit(
  key: string,
  limit: number,
  windowMs: number
): NextResponse | null {
  const now = Date.now();
  const current = buckets.get(key);

  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return null;
  }

  if (current.count >= limit) {
    const retryAfter = Math.max(1, Math.ceil((current.resetAt - now) / 1000));
    return NextResponse.json(
      { error: "Too many PDF export requests" },
      { status: 429, headers: { "Retry-After": String(retryAfter) } }
    );
  }

  current.count += 1;
  return null;
}
