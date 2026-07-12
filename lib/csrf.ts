import { NextRequest, NextResponse } from "next/server";
import { getAppUrl } from "@/lib/env";

export const SAME_ORIGIN_HEADER = "x-dillinger-request";
export const SAME_ORIGIN_HEADER_VALUE = "same-origin";

function configuredOrigins(): Set<string> {
  const values = [
    getAppUrl(),
    ...(process.env.DILLINGER_TRUSTED_ORIGINS || "").split(","),
  ];
  const origins = new Set<string>();

  for (const value of values) {
    const candidate = value.trim();
    if (!candidate) continue;

    try {
      const url = new URL(candidate);
      if (url.protocol === "https:" || url.protocol === "http:") {
        origins.add(url.origin);
      }
    } catch {
      // Invalid configured origins are ignored so they cannot weaken the check.
    }
  }

  return origins;
}

export function enforceSameOrigin(request: NextRequest): NextResponse | null {
  const origin = request.headers.get("origin");
  const marker = request.headers.get(SAME_ORIGIN_HEADER);

  if (!origin || marker !== SAME_ORIGIN_HEADER_VALUE) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    if (!configuredOrigins().has(new URL(origin).origin)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return null;
}
