import { NextResponse } from "next/server";
import { apiError, withApiRateLimit } from "@/lib/api/http";
import { registerWithEmail } from "@/lib/auth/service";
import {
  LOGGED_OUT_COOKIE_NAME,
  SESSION_COOKIE_NAME,
  signSessionToken,
} from "@/lib/auth/session";
import { registerRequestSchema } from "@/lib/validation/schemas";

export async function POST(request: Request) {
  const limited = withApiRateLimit(request, "auth_register", 20);
  if (limited) return limited;

  try {
    const body = await request.json();
    const parsed = registerRequestSchema.safeParse(body);
    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0]?.message || "Invalid registration fields";
      return apiError(firstIssue, 400, parsed.error.flatten());
    }

    const outcome = await registerWithEmail(parsed.data);
    const token = signSessionToken(outcome.user);
    const res = NextResponse.json(outcome, { status: 201 });
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
    if (err instanceof Error && err.message === "DUPLICATE_EMAIL") {
      return apiError("An account with this email address already exists.", 409);
    }
    return apiError(err instanceof Error ? err.message : "Registration failed", 500);
  }
}
