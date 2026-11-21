"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AuthDivider,
  AuthNotice,
  AuthSplitLayout,
  GoogleIcon,
  authEyeButton,
  authField,
  authLabel,
  authLink,
  authOutlineButton,
  authPrimaryButton,
} from "@/components/auth/AuthSplitLayout";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/lib/store/app-store";
import { useAuthOptions } from "@/hooks/useAuthOptions";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import { SCREEN_STRINGS } from "@/lib/i18n/screen-strings";
import { clearUserLocalCacheOnLogout } from "@/lib/offline/sync-engine";
import { useQueryClient } from "@tanstack/react-query";
import { Check, Eye, EyeOff, Loader2, UserPlus } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const isOnline = useAppStore((s) => s.isOnline);

  const authOptions = useAuthOptions();
  const { lang } = useLanguage();
  const s = SCREEN_STRINGS[lang];
  const [firstName, setFirstName] = React.useState("");
  const [lastName, setLastName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const checks = [
    { label: s.ruleLength, ok: password.length >= 8 },
    { label: s.ruleUpper, ok: /[A-Z]/.test(password) },
    { label: s.ruleLower, ok: /[a-z]/.test(password) },
    { label: s.ruleNumber, ok: /[0-9]/.test(password) },
  ];
  const allChecksValid = checks.every((c) => c.ok);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!isOnline) {
      setError(s.offlineRegister);
      return;
    }
    if (!allChecksValid) {
      setError(s.passwordRulesNotMet);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: email.trim(),
          password,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(
          res.status === 409
            ? s.emailTaken
            : res.status === 429
              ? s.tooManyTries
              : res.status === 400
                ? s.checkWhatYouTyped
                : s.somethingWentWrong
        );
        return;
      }
      await clearUserLocalCacheOnLogout().catch(() => undefined);
      queryClient.clear();
      await queryClient.invalidateQueries({ queryKey: ["auth_session"] });
      await queryClient.invalidateQueries({ queryKey: ["farms"] });
      router.push(json.redirectTo || "/onboarding");
      router.refresh();
    } catch {
      setError(s.noConnection);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthSplitLayout
      title={s.registerTitle}
      subtitle={s.registerSubtitle}
      footer={
        <p className="m-0">
          {s.haveAccount}{" "}
          <Link href="/login" className={authLink}>
            {s.signIn}
          </Link>
        </p>
      }
    >
      {!isOnline && <AuthNotice tone="offline">{s.offlineRegister}</AuthNotice>}

      {error && <AuthNotice tone="problem">{error}</AuthNotice>}

      {authOptions.googleSignIn && (
        <>
          <a
            href={isOnline ? "/api/auth/google" : "#"}
            onClick={(e) => {
              if (!isOnline) {
                e.preventDefault();
                setError(s.googleNeedsInternet);
              }
            }}
            className={cn(authOutlineButton, "no-underline")}
          >
            <GoogleIcon />
            <span>{s.signUpWithGoogle}</span>
          </a>
          <AuthDivider label={s.orUseEmail} />
        </>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="grid grid-cols-1 min-[400px]:grid-cols-2 gap-4 min-[400px]:gap-3">
          <div className="flex flex-col gap-2 min-w-0">
            <label htmlFor="reg-first" className={authLabel}>
              {s.firstName}
            </label>
            <input
              id="reg-first"
              autoComplete="given-name"
              placeholder="Amine"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className={authField}
              required
            />
          </div>
          <div className="flex flex-col gap-2 min-w-0">
            <label htmlFor="reg-last" className={authLabel}>
              {s.lastName}
            </label>
            <input
              id="reg-last"
              autoComplete="family-name"
              placeholder="Ben Ali"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className={authField}
              required
            />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="reg-email" className={authLabel}>
            {s.email}
          </label>
          <input
            id="reg-email"
            type="email"
            inputMode="email"
            autoComplete="email"
            dir="ltr"
            placeholder="amine@farm.tn"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={authField}
            required
          />
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="reg-password" className={authLabel}>
            {s.choosePassword}
          </label>
          <div className="relative">
            <input
              id="reg-password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              placeholder={s.passwordHint}
              aria-describedby="reg-password-rules"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={cn(authField, "pe-14")}
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? s.hidePassword : s.showPassword}
              aria-pressed={showPassword}
              className={authEyeButton}
            >
              {showPassword ? <EyeOff className="w-5 h-5" aria-hidden="true" /> : <Eye className="w-5 h-5" aria-hidden="true" />}
            </button>
          </div>
          <ul id="reg-password-rules" className="m-0 p-0 list-none grid grid-cols-2 gap-x-3 gap-y-1.5 pt-1">
            {checks.map((c) => (
              <li
                key={c.label}
                className={cn(
                  "flex items-center gap-1.5 text-[15px]",
                  c.ok ? "text-[var(--tp-fg-2E6B3A)] font-bold" : "text-[var(--tp-fg-4A5A4F)]"
                )}
              >
                <Check className={cn("w-4 h-4 shrink-0", !c.ok && "opacity-40")} aria-hidden="true" />
                <span>{c.label}</span>
              </li>
            ))}
          </ul>
        </div>

        <button type="submit" className={cn(authPrimaryButton, "mt-1")} disabled={loading}>
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
          ) : (
            <UserPlus className="w-5 h-5" aria-hidden="true" />
          )}
          <span>{loading ? s.creatingAccount : s.createAccountBtn}</span>
        </button>
      </form>
    </AuthSplitLayout>
  );
}
