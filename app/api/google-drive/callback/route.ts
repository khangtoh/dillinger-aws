export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { getAppUrl } from "@/lib/env";
import { hasValidOAuthState, oauthCallbackRedirect } from "@/lib/oauth-state";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const baseUrl = getAppUrl();

  if (!hasValidOAuthState(request, "google-drive")) {
    return oauthCallbackRedirect(
      new URL("/?error=google_invalid_state", baseUrl),
      "google-drive"
    );
  }

  if (error || !code) {
    return oauthCallbackRedirect(
      new URL("/?error=google_auth_failed", baseUrl),
      "google-drive"
    );
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = `${baseUrl}/api/google-drive/callback`;

  try {
    // Exchange code for tokens
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
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
        new URL("/?error=google_token_failed", baseUrl),
        "google-drive"
      );
    }

    const tokens = await tokenResponse.json();

    const response = oauthCallbackRedirect(
      new URL("/?google_connected=true", baseUrl),
      "google-drive"
    );
    response.cookies.set("google_drive_token", JSON.stringify({
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
    console.error("Google Drive callback error:", error);
    return oauthCallbackRedirect(
      new URL("/?error=google_callback_failed", baseUrl),
      "google-drive"
    );
  }
}
