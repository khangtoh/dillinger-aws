export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getAppUrl } from "@/lib/env";
import { createOAuthState, setOAuthStateCookie } from "@/lib/oauth-state";

export async function GET() {
  const clientId = process.env.GITHUB_CLIENT_ID;
  const baseUrl = getAppUrl();

  if (!clientId) {
    return NextResponse.json(
      { error: "GitHub OAuth not configured" },
      { status: 500 }
    );
  }

  const redirectUri = `${baseUrl}/api/github/callback`;
  const scope = "repo,user";
  const state = createOAuthState();

  const authUrl = new URL("https://github.com/login/oauth/authorize");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("scope", scope);
  authUrl.searchParams.set("state", state);

  const response = NextResponse.redirect(authUrl.toString());
  setOAuthStateCookie(response, "github", state);
  return response;
}
