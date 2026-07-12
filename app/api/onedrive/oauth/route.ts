export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getAppUrl } from "@/lib/env";
import { createOAuthState, setOAuthStateCookie } from "@/lib/oauth-state";

export async function GET() {
  const clientId = process.env.ONEDRIVE_CLIENT_ID;

  if (!clientId) {
    return NextResponse.json(
      { error: "OneDrive not configured" },
      { status: 500 }
    );
  }

  const redirectUri = `${getAppUrl()}/api/onedrive/callback`;
  const state = createOAuthState();

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "User.Read Files.ReadWrite.All offline_access",
    state,
  });

  // Use /consumers/ for personal Microsoft accounts (outlook.com, live.com, hotmail.com)
  // Use /common/ if your Azure AD app supports both work/school AND personal accounts
  const authUrl = `https://login.microsoftonline.com/consumers/oauth2/v2.0/authorize?${params.toString()}`;

  const response = NextResponse.redirect(authUrl);
  setOAuthStateCookie(response, "onedrive", state);
  return response;
}
