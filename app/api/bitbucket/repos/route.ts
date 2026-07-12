export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { providerIdentifier } from "@/lib/validation";

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const tokenCookie = cookieStore.get("bitbucket_token");

    if (!tokenCookie) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const tokens = JSON.parse(tokenCookie.value);
    const searchParams = request.nextUrl.searchParams;
    const workspace = providerIdentifier(searchParams.get("workspace"));

    if (!workspace) {
      return NextResponse.json({ error: "Workspace required" }, { status: 400 });
    }

    const response = await fetch(
      `https://api.bitbucket.org/2.0/repositories/${encodeURIComponent(workspace)}`,
      {
        headers: {
          Authorization: `Bearer ${tokens.access_token}`,
        },
      }
    );

    if (!response.ok) {
      return NextResponse.json({ error: "Failed to fetch repos" }, { status: 500 });
    }

    const data = await response.json();

    const repos = data.values.map((repo: { slug: string; name: string }) => ({
      slug: repo.slug,
      name: repo.name,
    }));

    return NextResponse.json({ repos });
  } catch (error) {
    console.error("Bitbucket repos error:", error);
    return NextResponse.json({ error: "Failed to fetch repos" }, { status: 500 });
  }
}
