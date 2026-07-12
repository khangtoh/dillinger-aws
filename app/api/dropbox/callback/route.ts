export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { getAppUrl } from "@/lib/env";
import { hasValidOAuthState, oauthCallbackRedirect } from "@/lib/oauth-state";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  const baseUrl = getAppUrl();

  if (!hasValidOAuthState(request, "dropbox")) {
    return oauthCallbackRedirect(`${baseUrl}?dropbox_error=invalid_state`, "dropbox");
  }

  if (error) {
    return oauthCallbackRedirect(
      `${baseUrl}?dropbox_error=${encodeURIComponent(error)}`,
      "dropbox"
    );
  }

  if (!code) {
    return oauthCallbackRedirect(`${baseUrl}?dropbox_error=no_code`, "dropbox");
  }

  try {
    const clientId = process.env.DROPBOX_APP_KEY!;
    const clientSecret = process.env.DROPBOX_APP_SECRET!;
    const redirectUri = `${baseUrl}/api/dropbox/callback`;

    // Exchange code for token using direct API call (Dropbox SDK has issues with fetch in Node.js)
    const tokenResponse = await fetch("https://api.dropboxapi.com/oauth2/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        code,
        grant_type: "authorization_code",
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenResponse.ok) {
      await tokenResponse.text();
      return oauthCallbackRedirect(
        `${baseUrl}?dropbox_error=token_exchange_failed`,
        "dropbox"
      );
    }

    const result = await tokenResponse.json();

    const response = oauthCallbackRedirect(
      `${baseUrl}?dropbox_connected=true`,
      "dropbox"
    );
    response.cookies.set(
      "dropbox_token",
      JSON.stringify({
        access_token: result.access_token,
        refresh_token: result.refresh_token,
      }),
      {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 30, // 30 days
        path: "/",
      }
    );

    return response;
  } catch {
    return oauthCallbackRedirect(
      `${baseUrl}?dropbox_error=token_exchange_failed`,
      "dropbox"
    );
  }
}
