"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthSplitLayout } from "@/components/auth/AuthSplitLayout";
import { Button, Input } from "@/components/ui/primitives";
import { useAppStore } from "@/lib/store/app-store";
import { useAuthOptions } from "@/hooks/useAuthOptions";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import { SCREEN_STRINGS } from "@/lib/i18n/screen-strings";
import { clearUserLocalCacheOnLogout } from "@/lib/offline/sync-engine";
import { useQueryClient } from "@tanstack/react-query";
import { AlertCircle, Check, Eye, EyeOff, Loader2, UserPlus, WifiOff } from "lucide-react";

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
    >
      {!isOnline && (
        <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-800 text-[15px] flex items-start gap-2 text-amber-900 dark:text-amber-200">
          <WifiOff className="h-5 w-5 shrink-0 mt-0.5" aria-hidden="true" />
          <span>{s.offlineRegister}</span>
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-300 dark:border-red-800 text-[15px] flex items-start gap-2 text-red-900 dark:text-red-200"
        >
          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

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
          className="w-full h-12 rounded-xl border border-border bg-card hover:bg-muted transition-colors flex items-center justify-center gap-2.5 text-[16px] font-semibold"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
            <path
              fill="#4285F4"
              d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
            />
            <path
              fill="#34A853"
              d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24Z"
            />
            <path
              fill="#FBBC05"
              d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14Z"
            />
            <path
              fill="#EA4335"
              d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96Z"
            />
          </svg>
          <span>{s.signUpWithGoogle}</span>
        </a>
  
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-[14px]">
            <span className="bg-background px-2 text-muted-foreground">{s.orUseEmail}</span>
          </div>
        </div>
        </>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label htmlFor="reg-first" className="text-[15px] font-semibold">
              {s.firstName}
            </label>
            <Input
              id="reg-first"
              autoComplete="given-name"
              placeholder="Amine"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="reg-last" className="text-[15px] font-semibold">
              {s.lastName}
            </label>
            <Input
              id="reg-last"
              autoComplete="family-name"
              placeholder="Ben Ali"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="reg-email" className="text-[15px] font-semibold">
            {s.email}
          </label>
          <Input
            id="reg-email"
            type="email"
            inputMode="email"
            autoComplete="email"
            dir="ltr"
            placeholder="amine@farm.tn"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="reg-password" className="text-[15px] font-semibold">
            {s.choosePassword}
          </label>
          <div className="relative">
            <Input
              id="reg-password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              placeholder={s.passwordHint}
              aria-describedby="reg-password-rules"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pe-12"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? s.hidePassword : s.showPassword}
              aria-pressed={showPassword}
              className="absolute end-1 top-1/2 -translate-y-1/2 w-10 h-10 inline-flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground cursor-pointer"
            >
              {showPassword ? <EyeOff className="h-5 w-5" aria-hidden="true" /> : <Eye className="h-5 w-5" aria-hidden="true" />}
            </button>
          </div>
          <div id="reg-password-rules" className="grid grid-cols-2 gap-1.5 pt-1">
            {checks.map((c) => (
              <div
                key={c.label}
                className={`flex items-center gap-1.5 text-[14px] ${
                  c.ok ? "text-emerald-700 dark:text-emerald-400 font-semibold" : "text-muted-foreground"
                }`}
              >
                <Check className={`h-4 w-4 shrink-0 ${c.ok ? "" : "opacity-40"}`} aria-hidden="true" />
                <span>{c.label}</span>
              </div>
            ))}
          </div>
        </div>

        <Button type="submit" size="lg" variant="primary" className="w-full" disabled={loading}>
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
          ) : (
            <UserPlus className="h-5 w-5" aria-hidden="true" />
          )}
          <span>{loading ? s.creatingAccount : s.createAccountBtn}</span>
        </Button>
      </form>

      <p className="text-[15px] text-center text-muted-foreground">
        {s.haveAccount}{" "}
        <Link
          href="/login"
          className="min-h-[40px] inline-flex items-center text-[var(--tp-fg-14532D)] dark:text-emerald-400 font-semibold hover:underline"
        >
          {s.signIn}
        </Link>
      </p>
    </AuthSplitLayout>
  );
}
