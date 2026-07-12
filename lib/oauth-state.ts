import { randomBytes, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

export type OAuthProvider =
  | "github"
  | "dropbox"
  | "google-drive"
  | "onedrive"
  | "bitbucket";

const OAUTH_STATE_MAX_AGE_SECONDS = 10 * 60;

function stateCookieName(provider: OAuthProvider): string {
  return `oauth_state_${provider}`;
}

function stateCookieOptions(provider: OAuthProvider) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: `/api/${provider}/callback`,
  };
}

export function createOAuthState(): string {
  return randomBytes(32).toString("base64url");
}

export function setOAuthStateCookie(
  response: NextResponse,
  provider: OAuthProvider,
  state: string
): void {
  response.cookies.set(stateCookieName(provider), state, {
    ...stateCookieOptions(provider),
    maxAge: OAUTH_STATE_MAX_AGE_SECONDS,
  });
}

export function hasValidOAuthState(
  request: NextRequest,
  provider: OAuthProvider
): boolean {
  const suppliedState = request.nextUrl.searchParams.get("state");
  const expectedState = request.cookies.get(stateCookieName(provider))?.value;

  if (!suppliedState || !expectedState) {
    return false;
  }

  const supplied = Buffer.from(suppliedState);
  const expected = Buffer.from(expectedState);

  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}

export function oauthCallbackRedirect(
  url: string | URL,
  provider: OAuthProvider
): NextResponse {
  const response = NextResponse.redirect(url);
  response.cookies.set(stateCookieName(provider), "", {
    ...stateCookieOptions(provider),
    maxAge: 0,
  });
  return response;
}
