import { NextResponse } from "next/server";
import {
  DEFAULT_DEMO_USER,
  getActiveSessionUser,
  SESSION_COOKIE_NAME,
  signSessionToken,
} from "@/lib/auth/session";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2).max(100).optional(),
  role: z.enum(["FARMER", "AGRONOMIST", "ADMIN"]).default("FARMER"),
});

export async function GET() {
  const user = await getActiveSessionUser();
  return NextResponse.json({ user });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid credentials payload" }, { status: 400 });
    }
    const user = {
      id:
        parsed.data.email === DEFAULT_DEMO_USER.email
          ? DEFAULT_DEMO_USER.id
          : `user_${Buffer.from(parsed.data.email).toString("hex").slice(0, 12)}`,
      email: parsed.data.email,
      name: parsed.data.name || parsed.data.email.split("@")[0],
      role: parsed.data.role,
    };
    const token = signSessionToken(user);
    const res = NextResponse.json({ user });
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
  const res = NextResponse.json({ user: DEFAULT_DEMO_USER });
  res.cookies.delete(SESSION_COOKIE_NAME);
  return res;
}
