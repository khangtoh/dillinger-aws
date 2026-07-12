export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { enforceSameOrigin } from "@/lib/csrf";
import {
  boundedString,
  isObject,
  optionalBoundedString,
  providerContent,
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
    const content = providerContent(body.content);
    const message = optionalBoundedString(body.message, 500);

    if (!workspace || !repo || !branch || !path || content === null || message === null) {
      return NextResponse.json({ error: "Invalid or missing fields" }, { status: 400 });
    }

    const commitMessage = message || `Update ${path}`;

    // Create form data for the commit
    const formData = new FormData();
    formData.append(path, content);
    formData.append("message", commitMessage);
    formData.append("branch", branch);

    const response = await fetch(
      `https://api.bitbucket.org/2.0/repositories/${encodeURIComponent(workspace)}/${encodeURIComponent(repo)}/src`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        body: formData,
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error("Bitbucket save error:", error);
      return NextResponse.json({ error: "Failed to save file" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      path,
    });
  } catch (error) {
    console.error("Bitbucket save error:", error);
    return NextResponse.json({ error: "Failed to save file" }, { status: 500 });
  }
}
