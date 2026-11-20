import { NextResponse } from "next/server";
import { apiError, withApiRateLimit } from "@/lib/api/http";
import { loginWithEmail } from "@/lib/auth/service";
import {
  LOGGED_OUT_COOKIE_NAME,
  SESSION_COOKIE_NAME,
  signSessionToken,
} from "@/lib/auth/session";
import { emailLoginRequestSchema } from "@/lib/validation/schemas";

export async function POST(request: Request) {
  const limited = withApiRateLimit(request, "auth_login", 30);
  if (limited) return limited;

  try {
    const body = await request.json();
    const parsed = emailLoginRequestSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(parsed.error.issues[0]?.message || "Invalid login inputs", 400);
    }

    const outcome = await loginWithEmail(parsed.data);
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
    if (err instanceof Error && err.message === "INVALID_CREDENTIALS") {
      return apiError("Incorrect email or password.", 401);
    }
    return apiError("Sign in failed", 500);
  }
}
