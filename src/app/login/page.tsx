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
import { AlertCircle, Eye, EyeOff, Loader2, LogIn, WifiOff } from "lucide-react";

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
    >
      {!isOnline && (
        <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-800 text-[15px] flex items-start gap-2 text-amber-900 dark:text-amber-200">
          <WifiOff className="h-5 w-5 shrink-0 mt-0.5" aria-hidden="true" />
          <span>{s.offlineSignIn}</span>
        </div>
      )}

      {urlNotice && (
        <div
          role="status"
          className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-800 text-[15px] text-amber-900 dark:text-amber-200"
        >
          {urlNotice === "expired" ? s.sessionExpired : urlNotice === "google" ? s.googleNotReady : s.signInProblem}
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
        {/* Google OAuth Button */}
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
          <span>{s.continueWithGoogle}</span>
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
        <div className="space-y-1.5">
          <label htmlFor="login-email" className="text-[15px] font-semibold">
            {s.email}
          </label>
          <Input
            id="login-email"
            type="email"
            inputMode="email"
            autoComplete="email"
            dir="ltr"
            placeholder="farmer@example.tn"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label htmlFor="login-password" className="text-[15px] font-semibold">
              {s.password}
            </label>
            {authOptions.passwordReset && (
              <Link
                href="/forgot-password"
                className="min-h-[40px] inline-flex items-center text-[15px] text-[var(--tp-fg-14532D)] dark:text-emerald-400 hover:underline font-semibold"
              >
                {s.forgotPassword}
              </Link>
            )}
          </div>
          <div className="relative">
            <Input
              id="login-password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder={s.yourPassword}
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
        </div>

        <Button type="submit" size="lg" variant="primary" className="w-full" disabled={loading}>
          {loading ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> : <LogIn className="h-5 w-5 rtl:rotate-180" aria-hidden="true" />}
          <span>{loading ? s.signingIn : s.signIn}</span>
        </Button>
      </form>

      <div className="pt-2 space-y-3">
        <p className="text-[15px] text-center text-muted-foreground">
          {s.newHere}{" "}
          <Link
            href="/register"
            className="min-h-[40px] inline-flex items-center text-[var(--tp-fg-14532D)] dark:text-emerald-400 font-semibold hover:underline"
          >
            {s.createAccount}
          </Link>
        </p>

        {authOptions.demoLogin && (
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={handleDemoLogin}
            disabled={loading}
          >
            {s.tryDemoFarm}
          </Button>
        )}
      </div>
    </AuthSplitLayout>
  );
}
