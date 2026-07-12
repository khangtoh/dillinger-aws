export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { getAppUrl } from "@/lib/env";
import { hasValidOAuthState, oauthCallbackRedirect } from "@/lib/oauth-state";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const baseUrl = getAppUrl();

  if (!hasValidOAuthState(request, "bitbucket")) {
    return oauthCallbackRedirect(
      new URL("/?error=bitbucket_invalid_state", baseUrl),
      "bitbucket"
    );
  }

  if (error || !code) {
    return oauthCallbackRedirect(
      new URL("/?error=bitbucket_auth_failed", baseUrl),
      "bitbucket"
    );
  }

  const clientId = process.env.BITBUCKET_CLIENT_ID;
  const clientSecret = process.env.BITBUCKET_CLIENT_SECRET;
  const redirectUri = `${baseUrl}/api/bitbucket/callback`;

  try {
    // Exchange code for tokens
    const tokenResponse = await fetch("https://bitbucket.org/site/oauth2/access_token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenResponse.ok) {
      return oauthCallbackRedirect(
        new URL("/?error=bitbucket_token_failed", baseUrl),
        "bitbucket"
      );
    }

    const tokens = await tokenResponse.json();

    const response = oauthCallbackRedirect(
      new URL("/?bitbucket_connected=true", baseUrl),
      "bitbucket"
    );
    response.cookies.set("bitbucket_token", JSON.stringify({
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
    console.error("Bitbucket callback error:", error);
    return oauthCallbackRedirect(
      new URL("/?error=bitbucket_callback_failed", baseUrl),
      "bitbucket"
    );
  }
}
