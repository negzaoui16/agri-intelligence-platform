import { NextResponse } from "next/server";
import { getAuthOptions } from "@/lib/auth/config";
import {
  DEFAULT_DEMO_USER,
  getSessionState,
  LOGGED_OUT_COOKIE_NAME,
  SESSION_COOKIE_NAME,
  signSessionToken,
} from "@/lib/auth/session";
import { getFarmerProfile, getOnboardingProgress } from "@/lib/db/repository";
import { z } from "zod";

const demoSwitchSchema = z.object({
  email: z.string().email().optional(),
  name: z.string().min(2).max(100).optional(),
  role: z.enum(["FARMER", "AGRONOMIST", "ADMIN"]).default("FARMER"),
});

export async function GET() {
  const state = await getSessionState();
  if (!state.user) {
    return NextResponse.json({
      user: null,
      isAuthenticated: false,
      isExpired: state.isExpired,
      isDemoFallback: false,
      farmerProfile: null,
      onboardingProgress: null,
    });
  }
  const farmerProfile = await getFarmerProfile(state.user.id);
  const onboardingProgress = await getOnboardingProgress(state.user.id);
  return NextResponse.json({
    user: state.user,
    isAuthenticated: true,
    isExpired: false,
    isDemoFallback: state.isDemoFallback,
    farmerProfile,
    onboardingProgress,
  });
}

export async function POST(request: Request) {
  // Signs in without a password: a development shortcut only, never on a live site
  if (!getAuthOptions().demoLogin) {
    return NextResponse.json({ error: "Demo sign-in is not available." }, { status: 403 });
  }
  try {
    const body = await request.json();
    const parsed = demoSwitchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid credentials payload" }, { status: 400 });
    }
    const user = parsed.data.email
      ? {
          id:
            parsed.data.email === DEFAULT_DEMO_USER.email
              ? DEFAULT_DEMO_USER.id
              : `user_${Buffer.from(parsed.data.email).toString("hex").slice(0, 12)}`,
          email: parsed.data.email,
          name: parsed.data.name || parsed.data.email.split("@")[0],
          role: parsed.data.role,
        }
      : DEFAULT_DEMO_USER;
    const token = signSessionToken(user);
    const res = NextResponse.json({ user, redirectTo: "/" });
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
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
}

export async function DELETE() {
  const res = NextResponse.json({ loggedOut: true, redirectTo: "/login" });
  res.cookies.delete(SESSION_COOKIE_NAME);
  res.cookies.set(LOGGED_OUT_COOKIE_NAME, "1", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}
