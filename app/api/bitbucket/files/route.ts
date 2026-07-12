export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { enforceSameOrigin } from "@/lib/csrf";
import {
  boundedString,
  encodeProviderPath,
  isObject,
  providerIdentifier,
  providerPath,
} from "@/lib/validation";

async function getAccessToken(): Promise<string | null> {
  const cookieStore = await cookies();
  const tokenCookie = cookieStore.get("bitbucket_token");

  if (!tokenCookie) return null;

  const tokens = JSON.parse(tokenCookie.value);
  return tokens.access_token;
}

// GET: List files in a directory
export async function GET(request: NextRequest) {
  const accessToken = await getAccessToken();

  if (!accessToken) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const workspace = providerIdentifier(searchParams.get("workspace"));
  const repo = providerIdentifier(searchParams.get("repo"));
  const branch = boundedString(searchParams.get("branch") || "main", 255);
  const rawPath = searchParams.get("path") || "";
  const path = rawPath ? providerPath(rawPath) : "";

  if (!workspace || !repo || !branch || path === null) {
    return NextResponse.json({ error: "Invalid repository fields" }, { status: 400 });
  }

  try {
    // For listing directory contents, we need to add trailing slash if no path
    const apiPath = path ? `/${encodeProviderPath(path)}/` : "/";
    const url = `https://api.bitbucket.org/2.0/repositories/${encodeURIComponent(workspace)}/${encodeURIComponent(repo)}/src/${encodeURIComponent(branch)}${apiPath}`;

    console.log("Bitbucket: Fetching files from", url);

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    console.log("Bitbucket files API response status:", response.status);

    if (!response.ok) {
      const error = await response.text();
      console.error("Bitbucket list files error:", error);
      return NextResponse.json({ error: "Failed to list files" }, { status: 500 });
    }

    const data = await response.json();

    // Filter for directories and markdown files
    const files = data.values
      .filter((item: { type: string; path: string }) =>
        item.type === "commit_directory" || item.path.endsWith(".md")
      )
      .map((item: { type: string; path: string }) => ({
        path: item.path,
        name: item.path.split("/").pop(),
        isFolder: item.type === "commit_directory",
      }));

    return NextResponse.json({ files });
  } catch (error) {
    console.error("Bitbucket files error:", error);
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
    const workspace = providerIdentifier(body.workspace);
    const repo = providerIdentifier(body.repo);
    const branch = body.branch ? boundedString(body.branch, 255) : "main";
    const path = providerPath(body.path);

    if (!workspace || !repo || !branch || !path) {
      return NextResponse.json({ error: "Invalid or missing fields" }, { status: 400 });
    }

    // Get file content
    const response = await fetch(
      `https://api.bitbucket.org/2.0/repositories/${encodeURIComponent(workspace)}/${encodeURIComponent(repo)}/src/${encodeURIComponent(branch)}/${encodeProviderPath(path)}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      return NextResponse.json({ error: "Failed to fetch file" }, { status: 500 });
    }

    const content = await response.text();

    return NextResponse.json({
      name: path.split("/").pop(),
      content,
      path,
    });
  } catch (error) {
    console.error("Bitbucket file content error:", error);
    return NextResponse.json({ error: "Failed to fetch file content" }, { status: 500 });
  }
}
