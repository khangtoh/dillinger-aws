export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { enforceSameOrigin } from "@/lib/csrf";
import { boundedString, isObject } from "@/lib/validation";

async function getAccessToken(): Promise<string | null> {
  const cookieStore = await cookies();
  const tokenCookie = cookieStore.get("onedrive_token");

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
  const folderId = boundedString(searchParams.get("folderId") || "root", 512);
  if (!folderId) {
    return NextResponse.json({ error: "Invalid folder ID" }, { status: 400 });
  }

  try {
    const endpoint = folderId === "root"
      ? "https://graph.microsoft.com/v1.0/me/drive/root/children"
      : `https://graph.microsoft.com/v1.0/me/drive/items/${encodeURIComponent(folderId)}/children`;

    console.log("OneDrive: Fetching files from", endpoint);

    // Note: Personal OneDrive accounts don't support $filter, so we fetch all and filter server-side
    const response = await fetch(endpoint, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    console.log("OneDrive files API response status:", response.status);

    if (!response.ok) {
      const error = await response.text();
      console.error("OneDrive list files error:", response.status, error);
      return NextResponse.json({ error: "Failed to list files" }, { status: 500 });
    }

    const data = await response.json();

    // Filter for folders and .md files on the server side
    const files = data.value
      .filter((item: { folder?: object; name: string }) => {
        return item.folder || item.name.toLowerCase().endsWith('.md');
      })
      .map((item: { id: string; name: string; folder?: object }) => ({
        id: item.id,
        name: item.name,
        isFolder: !!item.folder,
      }));

    return NextResponse.json({ files });
  } catch (error) {
    console.error("OneDrive files error:", error);
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
    const fileId = boundedString(body.fileId, 512);
    if (!fileId) {
      return NextResponse.json({ error: "Invalid file ID" }, { status: 400 });
    }
    const encodedFileId = encodeURIComponent(fileId);

    const headers = { Authorization: `Bearer ${accessToken}` };

    const [metaResponse, contentResponse] = await Promise.all([
      fetch(`https://graph.microsoft.com/v1.0/me/drive/items/${encodedFileId}`, { headers }),
      fetch(`https://graph.microsoft.com/v1.0/me/drive/items/${encodedFileId}/content`, { headers }),
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
    console.error("OneDrive file content error:", error);
    return NextResponse.json({ error: "Failed to fetch file content" }, { status: 500 });
  }
}
