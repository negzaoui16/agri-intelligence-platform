/**
 * Production safety rules for sign-in, kept in one place.
 *
 * Local development keeps its shortcuts (demo workspace, Google stand-in without real
 * Google keys, reset codes shown on screen). In production those shortcuts are off,
 * because each of them lets someone sign in without proving who they are.
 */

const DEV_FALLBACK_SECRET = "agri-intelligence-platform-dev-secret-local";

export const DEMO_ACCOUNT_EMAIL = "agronomist@terrapulse.agri";

export function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

/**
 * Secret used to sign login cookies. Anyone who knows it can forge a login for any user,
 * so production refuses to run with a missing, short or development value.
 */
export function getAuthSecret(): string {
  const secret = process.env.AUTH_SECRET?.trim() ?? "";
  if (!isProduction()) return secret || DEV_FALLBACK_SECRET;
  if (secret.length < 32 || /dev-secret|change-in-production|dev-secret-local/i.test(secret)) {
    throw new Error(
      "AUTH_SECRET must be set to a long random value in production (for example: openssl rand -base64 48)."
    );
  }
  return secret;
}

export function isGoogleConfigured(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID?.trim() && process.env.GOOGLE_CLIENT_SECRET?.trim());
}

export interface AuthOptions {
  /** "Continue with Demo Agronomist Workspace" (shared account, development only) */
  demoLogin: boolean;
  /** Google button: real Google sign-in, or the local stand-in in development */
  googleSignIn: boolean;
  /**
   * Password reset. The app does not send emails yet, so the code can only be shown
   * on screen, which is safe in development only.
   */
  passwordReset: boolean;
}

export function getAuthOptions(): AuthOptions {
  const prod = isProduction();
  return {
    demoLogin: !prod,
    googleSignIn: isGoogleConfigured() || !prod,
    passwordReset: !prod,
  };
}

/** The local Google stand-in (sign in by typing an email) must never run on a live site. */
export function isGoogleStandInAllowed(): boolean {
  return !isProduction() && !isGoogleConfigured();
}
