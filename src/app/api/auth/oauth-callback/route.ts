import { cookies } from "next/headers";
import { isGoogleStandInAllowed } from "@/lib/auth/config";
import { NextResponse } from "next/server";
import { apiError } from "@/lib/api/http";
import { loginOrRegisterWithGoogle } from "@/lib/auth/service";
import {
  LOGGED_OUT_COOKIE_NAME,
  SESSION_COOKIE_NAME,
  signSessionToken,
} from "@/lib/auth/session";
import { z } from "zod";

const oauthConfirmSchema = z.object({
  email: z.string().trim().email(),
  name: z.string().trim().min(2).max(120),
  googleId: z.string().min(3).max(128).optional(),
  avatarUrl: z.string().url().optional().nullable(),
});

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  if (error) {
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(error)}`, url.origin)
    );
  }

  if (!code) {
    return NextResponse.redirect(
      new URL(
        isGoogleStandInAllowed() ? "/auth/callback?provider=google" : "/login?error=oauth_not_configured",
        url.origin
      )
    );
  }

  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  const origin = process.env.NEXT_PUBLIC_APP_URL || url.origin;
  const redirectUri = `${origin}/api/auth/oauth-callback`;

  const cookieStore = await cookies();
  const expectedState = cookieStore.get("oauth_state")?.value;
  if (expectedState && state !== expectedState) {
    return NextResponse.redirect(new URL("/login?error=invalid_oauth_state", url.origin));
  }

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(new URL("/login?error=oauth_not_configured", url.origin));
  }

  try {
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });
    if (!tokenRes.ok) {
      return NextResponse.redirect(new URL("/login?error=google_token_exchange_failed", url.origin));
    }
    const tokenJson = (await tokenRes.json()) as { access_token?: string };
    const profileRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${tokenJson.access_token}` },
    });
    if (!profileRes.ok) {
      return NextResponse.redirect(new URL("/login?error=google_userinfo_failed", url.origin));
    }
    const profile = (await profileRes.json()) as {
      sub: string;
      email: string;
      name?: string;
      picture?: string;
    };

    const outcome = await loginOrRegisterWithGoogle({
      email: profile.email,
      name: profile.name || profile.email.split("@")[0],
      googleId: profile.sub,
      avatarUrl: profile.picture ?? null,
    });

    const token = signSessionToken(outcome.user);
    const res = NextResponse.redirect(new URL(outcome.redirectTo, url.origin));
    res.cookies.delete("oauth_state");
    res.cookies.delete(LOGGED_OUT_COOKIE_NAME);
    res.cookies.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 14,
    });
    return res;
  } catch {
    return NextResponse.redirect(new URL("/login?error=google_oauth_error", url.origin));
  }
}

export async function POST(request: Request) {
  // Local stand-in for Google: signs in with a typed email and no proof of ownership.
  // Allowed only in development when real Google keys are not set.
  if (!isGoogleStandInAllowed()) {
    return apiError("Google sign-in must go through Google.", 403);
  }
  try {
    const body = await request.json();
    const parsed = oauthConfirmSchema.safeParse(body);
    if (!parsed.success) {
      return apiError("Invalid Google profile details", 400);
    }

    const outcome = await loginOrRegisterWithGoogle({
      email: parsed.data.email,
      name: parsed.data.name,
      googleId:
        parsed.data.googleId ||
        `google_${Buffer.from(parsed.data.email.toLowerCase()).toString("hex").slice(0, 16)}`,
      avatarUrl: parsed.data.avatarUrl ?? null,
    });

    const token = signSessionToken(outcome.user);
    const res = NextResponse.json(outcome);
    res.cookies.delete(LOGGED_OUT_COOKIE_NAME);
    res.cookies.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 14,
    });
    return res;
  } catch (err) {
    return apiError(err instanceof Error ? err.message : "OAuth sign-in failed", 500);
  }
}
