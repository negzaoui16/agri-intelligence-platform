import crypto from "node:crypto";
import { cookies } from "next/headers";

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: "FARMER" | "AGRONOMIST" | "ADMIN";
}

export const DEFAULT_DEMO_USER: SessionUser = {
  id: "user_demo_agronomist",
  email: "agronomist@terrapulse.agri",
  name: "Field Agronomist",
  role: "AGRONOMIST",
};

const COOKIE_NAME = "terrapulse_session";

function getSecret(): string {
  return process.env.AUTH_SECRET || "agri-intelligence-platform-dev-secret-local";
}

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, original] = stored.split(":");
  if (!salt || !original) return false;
  const candidate = crypto.scryptSync(password, salt, 64).toString("hex");
  return crypto.timingSafeEqual(Buffer.from(candidate, "hex"), Buffer.from(original, "hex"));
}

export function signSessionToken(user: SessionUser): string {
  const payload = Buffer.from(
    JSON.stringify({ ...user, exp: Date.now() + 1000 * 60 * 60 * 24 * 14 }),
    "utf8"
  ).toString("base64url");
  const sig = crypto.createHmac("sha256", getSecret()).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

export function verifySessionToken(token: string): SessionUser | null {
  try {
    const [payload, sig] = token.split(".");
    if (!payload || !sig) return null;
    const expectedSig = crypto
      .createHmac("sha256", getSecret())
      .update(payload)
      .digest("base64url");
    if (sig.length !== expectedSig.length) return null;
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSig))) return null;
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (!parsed.exp || Date.now() > parsed.exp) return null;
    return {
      id: String(parsed.id),
      email: String(parsed.email),
      name: String(parsed.name),
      role: parsed.role || "FARMER",
    };
  } catch {
    return null;
  }
}

export async function getActiveSessionUser(): Promise<SessionUser> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (token) {
      const verified = verifySessionToken(token);
      if (verified) return verified;
    }
  } catch {
    // cookies() may be unavailable outside Next request context (e.g., tests)
  }
  return DEFAULT_DEMO_USER;
}

export const SESSION_COOKIE_NAME = COOKIE_NAME;
