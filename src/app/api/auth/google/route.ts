import crypto from "node:crypto";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const origin = process.env.NEXT_PUBLIC_APP_URL || url.origin;
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const redirectUri = `${origin}/api/auth/oauth-callback`;

  if (clientId && process.env.GOOGLE_CLIENT_SECRET?.trim()) {
    const state = crypto.randomBytes(16).toString("hex");
    const googleAuthUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    googleAuthUrl.searchParams.set("client_id", clientId);
    googleAuthUrl.searchParams.set("redirect_uri", redirectUri);
    googleAuthUrl.searchParams.set("response_type", "code");
    googleAuthUrl.searchParams.set("scope", "openid email profile");
    googleAuthUrl.searchParams.set("access_type", "offline");
    googleAuthUrl.searchParams.set("prompt", "select_account");
    googleAuthUrl.searchParams.set("state", state);

    const res = NextResponse.redirect(googleAuthUrl.toString());
    res.cookies.set("oauth_state", state, {
      httpOnly: true,
      sameSite: "lax",
      maxAge: 600,
      path: "/",
    });
    return res;
  }

  // Redirect to callback page for Google OAuth configuration / local dev OAuth flow
  return NextResponse.redirect(new URL("/auth/callback?provider=google", url.origin));
}
