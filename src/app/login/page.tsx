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
import { Eye, EyeOff, Loader2, LogIn } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const isOnline = useAppStore((s) => s.isOnline);

  const authOptions = useAuthOptions();
  const { lang } = useLanguage();
  const s = SCREEN_STRINGS[lang];
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  // Notices from the sign-in link are kept as codes so they follow the chosen language.
  const [urlNotice, setUrlNotice] = React.useState<"expired" | "google" | "other" | null>(null);

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const sp = new URLSearchParams(window.location.search);
      const err = sp.get("error");
      const reason = sp.get("reason");
      if (reason === "expired") setUrlNotice("expired");
      else if (err) setUrlNotice(err === "oauth_not_configured" ? "google" : "other");
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setUrlNotice(null);
    if (!email.trim() || !password) {
      setError(s.enterEmailAndPassword);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(
          res.status === 401
            ? s.wrongEmailOrPassword
            : res.status === 429
              ? s.tooManyTries
              : res.status === 400
                ? s.checkWhatYouTyped
                : s.signInProblem
        );
        return;
      }
      await clearUserLocalCacheOnLogout().catch(() => undefined);
      queryClient.clear();
      await queryClient.invalidateQueries({ queryKey: ["auth_session"] });
      await queryClient.invalidateQueries({ queryKey: ["farms"] });
      router.push(json.redirectTo || "/");
      router.refresh();
    } catch {
      setError(s.noConnection);
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (res.ok) {
        await queryClient.invalidateQueries({ queryKey: ["auth_session"] });
        await queryClient.invalidateQueries({ queryKey: ["farms"] });
        router.push("/");
        router.refresh();
      } else {
        setError(s.signInProblem);
      }
    } catch {
      setError(s.noConnection);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthSplitLayout
      title={s.loginTitle}
      subtitle={s.loginSubtitle}
      footer={
        <p className="m-0">
          {s.newHere}{" "}
          <Link href="/register" className={authLink}>
            {s.createAccount}
          </Link>
        </p>
      }
    >
      {!isOnline && <AuthNotice tone="offline">{s.offlineSignIn}</AuthNotice>}

      {urlNotice && (
        <AuthNotice tone="problem">
          {urlNotice === "expired" ? s.sessionExpired : urlNotice === "google" ? s.googleNotReady : s.signInProblem}
        </AuthNotice>
      )}

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
            <span>{s.continueWithGoogle}</span>
          </a>
          <AuthDivider label={s.orUseEmail} />
        </>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <label htmlFor="login-email" className={authLabel}>
            {s.email}
          </label>
          <input
            id="login-email"
            type="email"
            inputMode="email"
            autoComplete="email"
            dir="ltr"
            placeholder="farmer@example.tn"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={authField}
            required
          />
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-3">
            <label htmlFor="login-password" className={authLabel}>
              {s.password}
            </label>
            {authOptions.passwordReset && (
              <Link href="/forgot-password" className={cn(authLink, "text-[15px]")}>
                {s.forgotPassword}
              </Link>
            )}
          </div>
          <div className="relative">
            <input
              id="login-password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder={s.yourPassword}
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
        </div>

        <button type="submit" className={cn(authPrimaryButton, "mt-1")} disabled={loading}>
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
          ) : (
            <LogIn className="w-5 h-5 rtl:rotate-180" aria-hidden="true" />
          )}
          <span>{loading ? s.signingIn : s.signIn}</span>
        </button>
      </form>

      {authOptions.demoLogin && (
        <button type="button" className={authOutlineButton} onClick={handleDemoLogin} disabled={loading}>
          {s.tryDemoFarm}
        </button>
      )}
    </AuthSplitLayout>
  );
}
