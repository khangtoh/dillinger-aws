export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { validateApiKey } from "@/lib/api-auth";
import { getExportFilename } from "@/lib/export";
import { renderPdfBuffer } from "@/lib/pdf";
import {
  isMarkdownWithinLimit,
  rejectOversizedRequest,
} from "@/lib/request-limits";

export async function POST(request: NextRequest) {
  const authError = validateApiKey(request);
  if (authError) return authError;

  const oversized = rejectOversizedRequest(request);
  if (oversized) return oversized;

  try {
    const { markdown, title = "document" } = await request.json();

    if (!isMarkdownWithinLimit(markdown)) {
      return NextResponse.json(
        { error: "markdown field is required and must not exceed 512 KiB" },
        { status: 400 }
      );
    }

    const pdf = await renderPdfBuffer({ markdown, title });
    const filename = getExportFilename(title, "pdf");

    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to export PDF" },
      { status: 500 }
    );
  }
}
