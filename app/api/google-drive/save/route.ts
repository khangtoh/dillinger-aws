export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { enforceSameOrigin } from "@/lib/csrf";
import {
  isObject,
  providerContent,
  providerFilename,
  providerIdentifier,
} from "@/lib/validation";

async function getAccessToken(): Promise<string | null> {
  const cookieStore = await cookies();
  const tokenCookie = cookieStore.get("google_drive_token");

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
    const folderId = body.folderId ? providerIdentifier(body.folderId) : undefined;
    const fileId = body.fileId ? providerIdentifier(body.fileId) : undefined;
    if (!name || content === null || folderId === null || fileId === null) {
      return NextResponse.json({ error: "Invalid file fields" }, { status: 400 });
    }

    const fileName = name.endsWith(".md") ? name : `${name}.md`;
    let targetFileId = fileId;

    // If no fileId provided, check if file with same name exists in the folder
    if (!targetFileId) {
      const parentId = folderId || "root";
      const query = `name = '${fileName.replace(/'/g, "\\'")}' and '${parentId}' in parents and trashed = false`;

      const searchResponse = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id)`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (searchResponse.ok) {
        const searchData = await searchResponse.json();
        if (searchData.files && searchData.files.length > 0) {
          // File exists, use its ID to update it
          targetFileId = searchData.files[0].id;
        }
      }
    }

    const metadata = {
      name: fileName,
      mimeType: "text/markdown",
      ...(!targetFileId && folderId ? { parents: [folderId] } : {}),
    };

    // Use multipart upload
    const boundary = "-------314159265358979323846";
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelimiter = `\r\n--${boundary}--`;

    const multipartBody =
      delimiter +
      "Content-Type: application/json; charset=UTF-8\r\n\r\n" +
      JSON.stringify(metadata) +
      delimiter +
      "Content-Type: text/markdown\r\n\r\n" +
      content +
      closeDelimiter;

    let url = "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart";
    let method = "POST";

    // If targetFileId exists (either provided or found), update existing file
    if (targetFileId) {
      url = `https://www.googleapis.com/upload/drive/v3/files/${encodeURIComponent(targetFileId)}?uploadType=multipart`;
      method = "PATCH";
    }

    const response = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": `multipart/related; boundary=${boundary}`,
      },
      body: multipartBody,
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("Google Drive save error:", error);
      return NextResponse.json({ error: "Failed to save file" }, { status: 500 });
    }

    const result = await response.json();

    return NextResponse.json({
      success: true,
      fileId: result.id,
      name: result.name,
    });
  } catch (error) {
    console.error("Google Drive save error:", error);
    return NextResponse.json({ error: "Failed to save file" }, { status: 500 });
  }
}
