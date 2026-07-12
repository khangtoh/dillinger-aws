export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { enforceSameOrigin } from "@/lib/csrf";

export async function POST(request: NextRequest) {
  const forbidden = enforceSameOrigin(request);
  if (forbidden) return forbidden;

  try {
    const cookieStore = await cookies();
    cookieStore.delete("onedrive_token");

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("OneDrive unlink error:", error);
    return NextResponse.json(
      { error: "Failed to unlink OneDrive" },
      { status: 500 }
    );
  }
}
