export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { getAppUrl } from "@/lib/env";
import { hasValidOAuthState, oauthCallbackRedirect } from "@/lib/oauth-state";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const baseUrl = getAppUrl();

  if (!hasValidOAuthState(request, "onedrive")) {
    return oauthCallbackRedirect(
      new URL("/?error=onedrive_invalid_state", baseUrl),
      "onedrive"
    );
  }

  if (error || !code) {
    return oauthCallbackRedirect(
      new URL("/?error=onedrive_auth_failed", baseUrl),
      "onedrive"
    );
  }

  const clientId = process.env.ONEDRIVE_CLIENT_ID;
  const clientSecret = process.env.ONEDRIVE_CLIENT_SECRET;
  const redirectUri = `${baseUrl}/api/onedrive/callback`;

  try {
    // Exchange code for tokens
    // Use /consumers/ for personal Microsoft accounts
    const tokenResponse = await fetch("https://login.microsoftonline.com/consumers/oauth2/v2.0/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: clientId!,
        client_secret: clientSecret!,
        code,
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenResponse.ok) {
      return oauthCallbackRedirect(
        new URL("/?error=onedrive_token_failed", baseUrl),
        "onedrive"
      );
    }

    const tokens = await tokenResponse.json();

    const response = oauthCallbackRedirect(
      new URL("/?onedrive_connected=true", baseUrl),
      "onedrive"
    );
    response.cookies.set("onedrive_token", JSON.stringify({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: Date.now() + (tokens.expires_in * 1000),
    }), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("OneDrive callback error:", error);
    return oauthCallbackRedirect(
      new URL("/?error=onedrive_callback_failed", baseUrl),
      "onedrive"
    );
  }
}
