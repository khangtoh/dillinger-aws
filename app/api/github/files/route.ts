export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getCached, setCache, tokenFingerprint } from "@/lib/cache";
import { enforceSameOrigin } from "@/lib/csrf";
import {
  encodeProviderPath,
  boundedString,
  isObject,
  providerIdentifier,
  providerPath,
} from "@/lib/validation";

export async function GET(request: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get("github_token")?.value;

  if (!token) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const owner = providerIdentifier(searchParams.get("owner"));
  const repo = providerIdentifier(searchParams.get("repo"));
  const branch = boundedString(searchParams.get("branch"), 255);

  if (!owner || !repo || !branch) {
    return NextResponse.json(
      { error: "Owner, repo, and branch are required" },
      { status: 400 }
    );
  }

  const cacheKey = `gh:files:${tokenFingerprint(token)}:${owner}:${repo}:${branch}`;
  const cached = getCached<unknown[]>(cacheKey);
  if (cached) {
    return NextResponse.json(cached);
  }

  try {
    // Get the tree for the branch
    const treeUrl = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/trees/${encodeURIComponent(branch)}?recursive=1`;

    const response = await fetch(treeUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github.v3+json",
      },
    });

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status}`);
    }

    const data = await response.json();

    // Filter for markdown files
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const markdownFiles = data.tree.filter(
      (item: Record<string, string>) =>
        item.type === "blob" &&
        (item.path.endsWith(".md") || item.path.endsWith(".markdown"))
    );

    const result =
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      markdownFiles.map((file: Record<string, string>) => ({
        path: file.path,
        sha: file.sha,
        url: file.url,
      }));

    setCache(cacheKey, result);

    return NextResponse.json(result);
  } catch (error) {
    console.error("GitHub files error:", error);
    return NextResponse.json({ error: "Failed to fetch files" }, { status: 500 });
  }
}

// Fetch single file content
export async function POST(request: NextRequest) {
  const forbidden = enforceSameOrigin(request);
  if (forbidden) return forbidden;

  const cookieStore = await cookies();
  const token = cookieStore.get("github_token")?.value;

  if (!token) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const body: unknown = await request.json();
    if (!isObject(body)) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const owner = providerIdentifier(body.owner);
    const repo = providerIdentifier(body.repo);
    const path = providerPath(body.path);

    if (!owner || !repo || !path) {
      return NextResponse.json(
        { error: "Owner, repo, and path are required" },
        { status: 400 }
      );
    }

    const response = await fetch(
      `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${encodeProviderPath(path)}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github.v3+json",
        },
      }
    );

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status}`);
    }

    const data = await response.json();

    // Decode base64 content
    const content = Buffer.from(data.content, "base64").toString("utf-8");

    return NextResponse.json({
      content,
      sha: data.sha,
      path: data.path,
    });
  } catch (error) {
    console.error("GitHub file fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch file" }, { status: 500 });
  }
}
