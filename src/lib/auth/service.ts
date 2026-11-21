import crypto from "node:crypto";
import { DEMO_ACCOUNT_EMAIL, isProduction } from "./config";
import {
  createUserAccount,
  findUserByEmail,
  findUserByResetTokenHash,
  getFarmerProfile,
  getOnboardingProgress,
  updateUserAccount,
  upsertFarmerProfile,
  upsertOnboardingProgress,
} from "@/lib/db/repository";
import { hashPassword, hashResetToken, verifyPassword, type SessionUser } from "./session";

export interface AuthOutcome {
  user: SessionUser;
  onboardingCompleted: boolean;
  redirectTo: "/onboarding" | "/";
}

export async function registerWithEmail(input: {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}): Promise<AuthOutcome> {
  const fullName = `${input.firstName.trim()} ${input.lastName.trim()}`.trim();
  const created = await createUserAccount({
    email: input.email,
    name: fullName,
    passwordHash: hashPassword(input.password),
    role: "FARMER",
    authProvider: "EMAIL",
    emailVerified: false,
  });

  await upsertFarmerProfile(created.id, {
    firstName: input.firstName.trim(),
    lastName: input.lastName.trim(),
    email: created.email,
    country: "Tunisia",
  });

  const progress = await upsertOnboardingProgress(created.id, {
    currentStep: 1,
    completedSteps: [],
    isCompleted: false,
    completedAt: null,
  });

  return {
    user: {
      id: created.id,
      email: created.email,
      name: created.name,
      role: created.role,
    },
    onboardingCompleted: progress.isCompleted,
    redirectTo: progress.isCompleted ? "/" : "/onboarding",
  };
}

export async function loginWithEmail(input: {
  email: string;
  password: string;
}): Promise<AuthOutcome> {
  // The demo account's password ships in the code: never accept it on a live site
  if (isProduction() && input.email.trim().toLowerCase() === DEMO_ACCOUNT_EMAIL) {
    throw new Error("INVALID_CREDENTIALS");
  }
  const user = await findUserByEmail(input.email);
  if (!user || !verifyPassword(input.password, user.passwordHash)) {
    throw new Error("INVALID_CREDENTIALS");
  }

  const progress = await getOnboardingProgress(user.id);
  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    },
    onboardingCompleted: progress.isCompleted,
    redirectTo: progress.isCompleted ? "/" : "/onboarding",
  };
}

export async function loginOrRegisterWithGoogle(input: {
  email: string;
  name: string;
  googleId: string;
  avatarUrl?: string | null;
}): Promise<AuthOutcome> {
  let user = await findUserByEmail(input.email);
  const nameParts = input.name.trim().split(/\s+/);
  const firstName = nameParts[0] || "Farmer";
  const lastName = nameParts.slice(1).join(" ") || "Tunisia";

  if (!user) {
    user = await createUserAccount({
      email: input.email,
      name: input.name || firstName,
      passwordHash: hashPassword(crypto.randomBytes(24).toString("hex")),
      role: "FARMER",
      authProvider: "GOOGLE",
      googleId: input.googleId,
      emailVerified: true,
    });
    await upsertFarmerProfile(user.id, {
      firstName,
      lastName,
      email: user.email,
      avatarUrl: input.avatarUrl ?? null,
      country: "Tunisia",
    });
    await upsertOnboardingProgress(user.id, {
      currentStep: 1,
      completedSteps: [],
      isCompleted: false,
      completedAt: null,
    });
  } else {
    if (!user.googleId) {
      await updateUserAccount(user.id, {
        googleId: input.googleId,
        emailVerified: true,
      });
    }
    const profile = await getFarmerProfile(user.id);
    if (!profile) {
      await upsertFarmerProfile(user.id, {
        firstName,
        lastName,
        email: user.email,
        avatarUrl: input.avatarUrl ?? null,
        country: "Tunisia",
      });
    }
  }

  const progress = await getOnboardingProgress(user.id);
  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    },
    onboardingCompleted: progress.isCompleted,
    redirectTo: progress.isCompleted ? "/" : "/onboarding",
  };
}

export async function requestPasswordReset(email: string): Promise<{
  accepted: boolean;
  devResetCode?: string;
}> {
  const user = await findUserByEmail(email);
  if (!user) {
    // Always return accepted=true to prevent account enumeration
    return { accepted: true };
  }
  const code = crypto.randomInt(100000, 999999).toString();
  const tokenHash = hashResetToken(code);
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

  await updateUserAccount(user.id, {
    resetTokenHash: tokenHash,
    resetTokenExpiresAt: expiresAt,
  });

  // The app does not send emails yet: the code may only be shown on screen in development.
  // Returning it in production would let anyone reset anyone's password.
  return {
    accepted: true,
    devResetCode: isProduction() ? undefined : code,
  };
}

export async function confirmPasswordReset(input: {
  token: string;
  newPassword: string;
}): Promise<boolean> {
  const tokenHash = hashResetToken(input.token.trim());
  const user = await findUserByResetTokenHash(tokenHash);
  if (!user) return false;

  await updateUserAccount(user.id, {
    passwordHash: hashPassword(input.newPassword),
    resetTokenHash: null,
    resetTokenExpiresAt: null,
  });
  return true;
}
