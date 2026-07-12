export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { enforceSameOrigin } from "@/lib/csrf";
import { isObject, providerIdentifier } from "@/lib/validation";

async function getAccessToken(): Promise<string | null> {
  const cookieStore = await cookies();
  const tokenCookie = cookieStore.get("google_drive_token");

  if (!tokenCookie) return null;

  const tokens = JSON.parse(tokenCookie.value);
  return tokens.access_token;
}

// GET: List files in a folder
export async function GET(request: NextRequest) {
  const accessToken = await getAccessToken();

  if (!accessToken) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const folderId = providerIdentifier(searchParams.get("folderId") || "root");
  if (!folderId) {
    return NextResponse.json({ error: "Invalid folder ID" }, { status: 400 });
  }

  try {
    // Query for folders and markdown files
    const query = `'${folderId}' in parents and trashed = false and (mimeType = 'application/vnd.google-apps.folder' or name contains '.md')`;

    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name,mimeType)&orderBy=folder,name`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error("Google Drive list files error:", error);
      return NextResponse.json({ error: "Failed to list files" }, { status: 500 });
    }

    const data = await response.json();

    const files = data.files.map((file: { id: string; name: string; mimeType: string }) => ({
      id: file.id,
      name: file.name,
      isFolder: file.mimeType === "application/vnd.google-apps.folder",
    }));

    return NextResponse.json({ files });
  } catch (error) {
    console.error("Google Drive files error:", error);
    return NextResponse.json({ error: "Failed to fetch files" }, { status: 500 });
  }
}

// POST: Get file content
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
    const fileId = providerIdentifier(body.fileId);
    if (!fileId) {
      return NextResponse.json({ error: "Invalid file ID" }, { status: 400 });
    }
    const encodedFileId = encodeURIComponent(fileId);

    const authHeaders = { Authorization: `Bearer ${accessToken}` };

    const [metaResponse, contentResponse] = await Promise.all([
      fetch(`https://www.googleapis.com/drive/v3/files/${encodedFileId}?fields=name`, {
        headers: authHeaders,
      }),
      fetch(`https://www.googleapis.com/drive/v3/files/${encodedFileId}?alt=media`, {
        headers: authHeaders,
      }),
    ]);

    if (!metaResponse.ok) {
      return NextResponse.json({ error: "Failed to get file metadata" }, { status: 500 });
    }

    if (!contentResponse.ok) {
      return NextResponse.json({ error: "Failed to download file" }, { status: 500 });
    }

    const [metadata, content] = await Promise.all([
      metaResponse.json(),
      contentResponse.text(),
    ]);

    return NextResponse.json({
      name: metadata.name,
      content,
    });
  } catch (error) {
    console.error("Google Drive file content error:", error);
    return NextResponse.json({ error: "Failed to fetch file content" }, { status: 500 });
  }
}
