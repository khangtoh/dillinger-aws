export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { enforceSameOrigin } from "@/lib/csrf";
import { isObject, providerContent, providerPath } from "@/lib/validation";

export async function POST(request: NextRequest) {
  const forbidden = enforceSameOrigin(request);
  if (forbidden) return forbidden;

  const cookieStore = await cookies();
  const tokenCookie = cookieStore.get("dropbox_token")?.value;

  if (!tokenCookie) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const body: unknown = await request.json();
    if (!isObject(body)) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }
    const path = providerPath(body.path);
    const content = providerContent(body.content);

    if (!path || content === null) {
      return NextResponse.json(
        { error: "Valid path and content are required" },
        { status: 400 }
      );
    }

    const { access_token } = JSON.parse(tokenCookie);

    // Ensure path starts with /
    const filePath = path.startsWith("/") ? path : `/${path}`;

    // Use direct API call instead of SDK
    const response = await fetch("https://content.dropboxapi.com/2/files/upload", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${access_token}`,
        "Content-Type": "application/octet-stream",
        "Dropbox-API-Arg": JSON.stringify({
          path: filePath,
          mode: "overwrite",
        }),
      },
      body: content,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Dropbox upload error:", errorText);
      return NextResponse.json({ error: "Failed to save file" }, { status: 500 });
    }

    const result = await response.json();

    return NextResponse.json({
      success: true,
      path: result.path_lower,
      name: result.name,
    });
  } catch (error) {
    console.error("Dropbox save error:", error);
    return NextResponse.json({ error: "Failed to save file" }, { status: 500 });
  }
}
