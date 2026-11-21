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
export const LOGGED_OUT_COOKIE_NAME = "terrapulse_logged_out";

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

export function hashResetToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function signSessionToken(user: SessionUser, ttlMs = 1000 * 60 * 60 * 24 * 14): string {
  const payload = Buffer.from(
    JSON.stringify({ ...user, exp: Date.now() + ttlMs }),
    "utf8"
  ).toString("base64url");
  const sig = crypto.createHmac("sha256", getSecret()).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

export function verifySessionTokenWithStatus(token: string): {
  user: SessionUser | null;
  expired: boolean;
} {
  try {
    const [payload, sig] = token.split(".");
    if (!payload || !sig) return { user: null, expired: false };
    const expectedSig = crypto
      .createHmac("sha256", getSecret())
      .update(payload)
      .digest("base64url");
    if (sig.length !== expectedSig.length) return { user: null, expired: false };
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSig))) {
      return { user: null, expired: false };
    }
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (!parsed.exp || Date.now() > parsed.exp) {
      return { user: null, expired: true };
    }
    return {
      user: {
        id: String(parsed.id),
        email: String(parsed.email),
        name: String(parsed.name),
        role: parsed.role || "FARMER",
      },
      expired: false,
    };
  } catch {
    return { user: null, expired: false };
  }
}

export function verifySessionToken(token: string): SessionUser | null {
  return verifySessionTokenWithStatus(token).user;
}

export async function getSessionState(): Promise<{
  user: SessionUser | null;
  isAuthenticated: boolean;
  isExpired: boolean;
  isDemoFallback: boolean;
}> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (token) {
      const check = verifySessionTokenWithStatus(token);
      if (check.user) {
        return {
          user: check.user,
          isAuthenticated: true,
          isExpired: false,
          isDemoFallback: false,
        };
      }
      if (check.expired) {
        return {
          user: null,
          isAuthenticated: false,
          isExpired: true,
          isDemoFallback: false,
        };
      }
    }
    if (cookieStore.get(LOGGED_OUT_COOKIE_NAME)?.value === "1") {
      return {
        user: null,
        isAuthenticated: false,
        isExpired: false,
        isDemoFallback: false,
      };
    }
  } catch {
    // cookies() unavailable outside Next request context (e.g., unit tests)
  }
  if (process.env.NODE_ENV !== "production") {
    return {
      user: DEFAULT_DEMO_USER,
      isAuthenticated: true,
      isExpired: false,
      isDemoFallback: true,
    };
  }
  return {
    user: null,
    isAuthenticated: false,
    isExpired: false,
    isDemoFallback: false,
  };
}

export async function getActiveSessionUser(): Promise<SessionUser> {
  const state = await getSessionState();
  return state.user ?? DEFAULT_DEMO_USER;
}

export const SESSION_COOKIE_NAME = COOKIE_NAME;
