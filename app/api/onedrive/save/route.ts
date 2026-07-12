export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { enforceSameOrigin } from "@/lib/csrf";
import {
  boundedString,
  isObject,
  providerContent,
  providerFilename,
} from "@/lib/validation";

async function getAccessToken(): Promise<string | null> {
  const cookieStore = await cookies();
  const tokenCookie = cookieStore.get("onedrive_token");

  if (!tokenCookie) return null;

  const tokens = JSON.parse(tokenCookie.value);
  return tokens.access_token;
}

export async function POST(request: NextRequest) {
  const forbidden = enforceSameOrigin(request);
  if (forbidden) return forbidden;

  const accessToken = await getAccessToken();

  if (!accessToken) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const body: unknown = await request.json();
    if (!isObject(body)) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }
    const name = providerFilename(body.name);
    const content = providerContent(body.content);
    const folderId = body.folderId ? boundedString(body.folderId, 512) : undefined;
    const fileId = body.fileId ? boundedString(body.fileId, 512) : undefined;
    if (!name || content === null || folderId === null || fileId === null) {
      return NextResponse.json({ error: "Invalid file fields" }, { status: 400 });
    }

    const fileName = name.endsWith(".md") ? name : `${name}.md`;
    const encodedFileName = encodeURIComponent(fileName);

    let url: string;

    if (fileId) {
      // Update existing file
      url = `https://graph.microsoft.com/v1.0/me/drive/items/${encodeURIComponent(fileId)}/content`;
    } else if (folderId && folderId !== "root") {
      // Create in specific folder
      url = `https://graph.microsoft.com/v1.0/me/drive/items/${encodeURIComponent(folderId)}:/${encodedFileName}:/content`;
    } else {
      // Create in root
      url = `https://graph.microsoft.com/v1.0/me/drive/root:/${encodedFileName}:/content`;
    }

    const response = await fetch(url, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "text/plain",
      },
      body: content,
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("OneDrive save error:", error);
      return NextResponse.json({ error: "Failed to save file" }, { status: 500 });
    }

    const result = await response.json();

    return NextResponse.json({
      success: true,
      fileId: result.id,
      name: result.name,
    });
  } catch (error) {
    console.error("OneDrive save error:", error);
    return NextResponse.json({ error: "Failed to save file" }, { status: 500 });
  }
}
