"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthSplitLayout } from "@/components/auth/AuthSplitLayout";
import { Button, Input } from "@/components/ui/primitives";
import { AlertCircle, CheckCircle2, Eye, EyeOff, KeyRound, Loader2 } from "lucide-react";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = React.useState<"REQUEST" | "RESET" | "DONE">("REQUEST");
  const [email, setEmail] = React.useState("");
  const [resetCode, setResetCode] = React.useState("");
  const [devCodeHint, setDevCodeHint] = React.useState<string | null>(null);
  const [newPassword, setNewPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Failed to send reset instructions.");
        return;
      }
      if (json.devResetCode) {
        setDevCodeHint(json.devResetCode);
        setResetCode(json.devResetCode);
      }
      setStep("RESET");
    } catch {
      setError("Network error requesting password reset.");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: resetCode, newPassword }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Invalid or expired recovery code.");
        return;
      }
      setStep("DONE");
    } catch {
      setError("Network error updating password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthSplitLayout
      title="Reset your password"
      subtitle="Recover access to your farmer profile, boundaries, and analysis reports."
    >
      {error && (
        <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-300 dark:border-red-800 text-xs flex items-start gap-2 text-red-900 dark:text-red-200">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {step === "REQUEST" && (
        <form onSubmit={handleRequest} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="fp-email" className="text-xs font-medium">
              Registered email address
            </label>
            <Input
              id="fp-email"
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
          <Button type="submit" size="lg" variant="primary" className="w-full" disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
            <span>Send Recovery Code</span>
          </Button>
        </form>
      )}

      {step === "RESET" && (
        <form onSubmit={handleReset} className="space-y-4">
          {devCodeHint && (
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800 text-xs">
              Local development recovery code generated: <strong className="font-mono">{devCodeHint}</strong>
            </div>
          )}
          <div className="space-y-1.5">
            <label htmlFor="fp-code" className="text-xs font-medium">
              6-digit recovery code
            </label>
            <Input
              id="fp-code"
              inputMode="numeric"
              placeholder="123456"
              value={resetCode}
              onChange={(e) => setResetCode(e.target.value)}
              className="h-11 font-mono"
              required
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="fp-pass" className="text-xs font-medium">
              New secure password
            </label>
            <div className="relative">
              <Input
                id="fp-pass"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                placeholder="Min. 8 chars with upper, lower & number"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="h-11 pr-10"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-muted-foreground"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <Button type="submit" size="lg" variant="primary" className="w-full" disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
            <span>Update Password</span>
          </Button>
        </form>
      )}

      {step === "DONE" && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800 text-xs flex items-start gap-2.5">
            <CheckCircle2 className="h-4 w-4 text-emerald-700 shrink-0 mt-0.5" />
            <span>Your password has been updated. You can now sign in with your new password.</span>
          </div>
          <Button size="lg" variant="primary" className="w-full" onClick={() => router.push("/login")}>
            Go to Sign In
          </Button>
        </div>
      )}

      <p className="text-xs text-center text-muted-foreground">
        Remembered your password?{" "}
        <Link href="/login" className="text-[#14532d] dark:text-emerald-400 font-semibold hover:underline">
          Back to Sign In
        </Link>
      </p>
    </AuthSplitLayout>
  );
}
