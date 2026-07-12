export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getAppUrl } from "@/lib/env";
import { createOAuthState, setOAuthStateCookie } from "@/lib/oauth-state";

export async function GET() {
  const clientId = process.env.BITBUCKET_CLIENT_ID;

  if (!clientId) {
    return NextResponse.json(
      { error: "Bitbucket not configured" },
      { status: 500 }
    );
  }

  const redirectUri = `${getAppUrl()}/api/bitbucket/callback`;
  const state = createOAuthState();

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "account repository",
    state,
  });

  const authUrl = `https://bitbucket.org/site/oauth2/authorize?${params.toString()}`;

  const response = NextResponse.redirect(authUrl);
  setOAuthStateCookie(response, "bitbucket", state);
  return response;
}
