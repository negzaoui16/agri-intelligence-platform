"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthSplitLayout } from "@/components/auth/AuthSplitLayout";
import { Button, Input } from "@/components/ui/primitives";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import { SCREEN_STRINGS } from "@/lib/i18n/screen-strings";
import { AlertCircle, CheckCircle2, Eye, EyeOff, KeyRound, Loader2 } from "lucide-react";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const { lang } = useLanguage();
  const s = SCREEN_STRINGS[lang];
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
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(
          res.status === 503
            ? s.resetUnavailable
            : res.status === 429
              ? s.tooManyTries
              : res.status === 400
                ? s.checkWhatYouTyped
                : s.somethingWentWrong
        );
        return;
      }
      if (json.devResetCode) {
        setDevCodeHint(json.devResetCode);
        setResetCode(json.devResetCode);
      }
      setStep("RESET");
    } catch {
      setError(s.noConnection);
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
      if (!res.ok) {
        setError(res.status === 429 ? s.tooManyTries : s.wrongOrOldCode);
        return;
      }
      setStep("DONE");
    } catch {
      setError(s.noConnection);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthSplitLayout
      title={s.resetTitle}
      subtitle={s.resetSubtitle}
    >
      {error && (
        <div
          role="alert"
          className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-300 dark:border-red-800 text-[15px] flex items-start gap-2 text-red-900 dark:text-red-200"
        >
          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      {step === "REQUEST" && (
        <form onSubmit={handleRequest} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="fp-email" className="text-[15px] font-semibold">
              {s.email}
            </label>
            <Input
              id="fp-email"
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
          <Button type="submit" size="lg" variant="primary" className="w-full" disabled={loading}>
            {loading ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> : <KeyRound className="h-5 w-5" aria-hidden="true" />}
            <span>{s.sendMeACode}</span>
          </Button>
        </form>
      )}

      {step === "RESET" && (
        <form onSubmit={handleReset} className="space-y-4">
          {devCodeHint && (
            <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800 text-[15px] text-emerald-900 dark:text-emerald-200">
              {s.devCodeNotice} <strong className="font-mono" dir="ltr">{devCodeHint}</strong>
            </div>
          )}
          <div className="space-y-1.5">
            <label htmlFor="fp-code" className="text-[15px] font-semibold">
              {s.codeLabel}
            </label>
            <Input
              id="fp-code"
              inputMode="numeric"
              autoComplete="one-time-code"
              dir="ltr"
              placeholder="123456"
              value={resetCode}
              onChange={(e) => setResetCode(e.target.value)}
              className="font-mono tracking-widest"
              required
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="fp-pass" className="text-[15px] font-semibold">
              {s.newPassword}
            </label>
            <div className="relative">
              <Input
                id="fp-pass"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                placeholder={s.passwordHint}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="pe-12"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? s.hidePassword : s.showPassword}
                aria-pressed={showPassword}
                className="absolute end-1 top-1/2 -translate-y-1/2 w-10 h-10 inline-flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="h-5 w-5" aria-hidden="true" /> : <Eye className="h-5 w-5" aria-hidden="true" />}
              </button>
            </div>
          </div>
          <Button type="submit" size="lg" variant="primary" className="w-full" disabled={loading}>
            {loading ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> : <KeyRound className="h-5 w-5" aria-hidden="true" />}
            <span>{s.saveNewPassword}</span>
          </Button>
        </form>
      )}

      {step === "DONE" && (
        <div className="space-y-4">
          <div
            role="status"
            className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800 text-[15px] text-emerald-900 dark:text-emerald-200 flex items-start gap-2.5"
          >
            <CheckCircle2 className="h-5 w-5 text-emerald-700 dark:text-emerald-400 shrink-0 mt-0.5" aria-hidden="true" />
            <span>{s.resetDone}</span>
          </div>
          <Button size="lg" variant="primary" className="w-full" onClick={() => router.push("/login")}>
            {s.goToSignIn}
          </Button>
        </div>
      )}

      <p className="text-[15px] text-center text-muted-foreground">
        {s.rememberedIt}{" "}
        <Link
          href="/login"
          className="min-h-[40px] inline-flex items-center text-[var(--tp-fg-14532D)] dark:text-emerald-400 font-semibold hover:underline"
        >
          {s.backToSignIn}
        </Link>
      </p>
    </AuthSplitLayout>
  );
}
