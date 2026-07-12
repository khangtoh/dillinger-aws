export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getExportFilename } from "@/lib/export";
import { renderPdfBuffer } from "@/lib/pdf";
import { enforceSameOrigin } from "@/lib/csrf";
import { enforceRateLimit } from "@/lib/rate-limit";
import {
  isMarkdownWithinLimit,
  rejectOversizedRequest,
} from "@/lib/request-limits";

export async function POST(request: NextRequest) {
  const forbidden = enforceSameOrigin(request);
  if (forbidden) return forbidden;

  const oversized = rejectOversizedRequest(request);
  if (oversized) return oversized;

  try {
    const { markdown, title } = await request.json();

    if (!isMarkdownWithinLimit(markdown)) {
      return NextResponse.json(
        { error: "Markdown content is required and must not exceed 512 KiB" },
        { status: 400 }
      );
    }

    const rateLimited = enforceRateLimit("public-pdf-export", 3, 60_000);
    if (rateLimited) return rateLimited;

    const pdf = await renderPdfBuffer({ markdown, title });
    const filename = getExportFilename(title, "pdf");

    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("PDF export error:", error);
    return NextResponse.json(
      { error: "Failed to export PDF" },
      { status: 500 }
    );
  }
}
