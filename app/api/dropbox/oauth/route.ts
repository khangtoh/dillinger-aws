export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { DropboxAuth } from "dropbox";
import { getAppUrl } from "@/lib/env";
import { createOAuthState, setOAuthStateCookie } from "@/lib/oauth-state";

export async function GET() {
  const clientId = process.env.DROPBOX_APP_KEY;
  const baseUrl = getAppUrl();

  if (!clientId) {
    return NextResponse.json(
      { error: "Dropbox OAuth not configured" },
      { status: 500 }
    );
  }

  const redirectUri = `${baseUrl}/api/dropbox/callback`;
  const state = createOAuthState();

  const dbxAuth = new DropboxAuth({ clientId });
  const authUrl = await dbxAuth.getAuthenticationUrl(
    redirectUri,
    state,
    "code",
    "offline",
    undefined,
    undefined,
    false
  );

  const response = NextResponse.redirect(authUrl.toString());
  setOAuthStateCookie(response, "dropbox", state);
  return response;
}
