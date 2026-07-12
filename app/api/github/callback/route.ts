export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { getAppUrl } from "@/lib/env";
import { hasValidOAuthState, oauthCallbackRedirect } from "@/lib/oauth-state";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  const baseUrl = getAppUrl();

  if (!hasValidOAuthState(request, "github")) {
    return oauthCallbackRedirect(`${baseUrl}?github_error=invalid_state`, "github");
  }

  if (error) {
    return oauthCallbackRedirect(
      `${baseUrl}?github_error=${encodeURIComponent(error)}`,
      "github"
    );
  }

  if (!code) {
    return oauthCallbackRedirect(`${baseUrl}?github_error=no_code`, "github");
  }

  try {
    // Exchange code for access token
    const tokenResponse = await fetch(
      "https://github.com/login/oauth/access_token",
      {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          client_id: process.env.GITHUB_CLIENT_ID,
          client_secret: process.env.GITHUB_CLIENT_SECRET,
          code,
        }),
      }
    );

    const tokenData = await tokenResponse.json();

    if (tokenData.error) {
      return oauthCallbackRedirect(
        `${baseUrl}?github_error=token_exchange_failed`,
        "github"
      );
    }

    const response = oauthCallbackRedirect(
      `${baseUrl}?github_connected=true`,
      "github"
    );
    response.cookies.set("github_token", tokenData.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: "/",
    });
    return response;
  } catch {
    return oauthCallbackRedirect(
      `${baseUrl}?github_error=token_exchange_failed`,
      "github"
    );
  }
}
