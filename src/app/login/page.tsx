"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthSplitLayout } from "@/components/auth/AuthSplitLayout";
import { Button, Input } from "@/components/ui/primitives";
import { useAppStore } from "@/lib/store/app-store";
import { clearUserLocalCacheOnLogout } from "@/lib/offline/sync-engine";
import { useQueryClient } from "@tanstack/react-query";
import { AlertCircle, Eye, EyeOff, Loader2, LogIn, WifiOff } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const isOnline = useAppStore((s) => s.isOnline);

  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [sessionNotice, setSessionNotice] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const sp = new URLSearchParams(window.location.search);
      const err = sp.get("error");
      const reason = sp.get("reason");
      if (reason === "expired") {
        setSessionNotice("Your session expired. Please sign in again to continue.");
      } else if (err) {
        setError(`Authentication notice: ${err.replaceAll("_", " ")}`);
      }
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email.trim() || !password) {
      setError("Please enter both your email address and password.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Incorrect email or password.");
        return;
      }
      await clearUserLocalCacheOnLogout().catch(() => undefined);
      queryClient.clear();
      await queryClient.invalidateQueries({ queryKey: ["auth_session"] });
      await queryClient.invalidateQueries({ queryKey: ["farms"] });
      router.push(json.redirectTo || "/");
      router.refresh();
    } catch {
      setError("Unable to reach the authentication server. Check your connection.");
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
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthSplitLayout
      title="Welcome back, farmer"
      subtitle="Sign in to access your agricultural parcels, water analysis, and solar simulations."
    >
      {!isOnline && (
        <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-800 text-xs flex items-start gap-2 text-amber-900 dark:text-amber-200">
          <WifiOff className="h-4 w-4 shrink-0 mt-0.5" />
          <span>
            You are currently offline. Online sign-in and Google OAuth require an internet connection.
          </span>
        </div>
      )}

      {sessionNotice && (
        <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200">
          {sessionNotice}
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="p-3 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-300 dark:border-red-800 text-xs flex items-start gap-2 text-red-900 dark:text-red-200"
        >
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Google OAuth Button */}
      <a
        href={isOnline ? "/api/auth/google" : "#"}
        onClick={(e) => {
          if (!isOnline) {
            e.preventDefault();
            setError("Google Sign-In requires an active internet connection.");
          }
        }}
        className="w-full h-11 rounded-xl border border-border bg-card hover:bg-muted transition-colors flex items-center justify-center gap-2.5 text-sm font-medium"
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
        <span>Continue with Google</span>
      </a>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-[11px] uppercase">
          <span className="bg-background px-2 text-muted-foreground">Or sign in with email</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="login-email" className="text-xs font-medium">
            Email address
          </label>
          <Input
            id="login-email"
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="farmer@example.tn"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-11"
            required
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label htmlFor="login-password" className="text-xs font-medium">
              Password
            </label>
            <Link
              href="/forgot-password"
              className="text-xs text-[var(--tp-fg-14532D)] dark:text-emerald-400 hover:underline font-medium"
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <Input
              id="login-password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-11 pr-10"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground cursor-pointer"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <Button type="submit" size="lg" variant="primary" className="w-full" disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
          <span>{loading ? "Signing in..." : "Sign in"}</span>
        </Button>
      </form>

      <div className="pt-2 space-y-3">
        <p className="text-xs text-center text-muted-foreground">
          New to TerraPulse?{" "}
          <Link
            href="/register"
            className="text-[var(--tp-fg-14532D)] dark:text-emerald-400 font-semibold hover:underline"
          >
            Create a farmer account
          </Link>
        </p>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="w-full text-xs text-muted-foreground"
          onClick={handleDemoLogin}
          disabled={loading}
        >
          Continue with Demo Agronomist Workspace
        </Button>
      </div>
    </AuthSplitLayout>
  );
}
