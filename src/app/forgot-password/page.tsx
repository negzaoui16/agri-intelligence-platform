"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AuthNotice,
  AuthSplitLayout,
  authEyeButton,
  authField,
  authLabel,
  authLink,
  authPrimaryButton,
} from "@/components/auth/AuthSplitLayout";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import { SCREEN_STRINGS } from "@/lib/i18n/screen-strings";
import { Eye, EyeOff, KeyRound, Loader2 } from "lucide-react";

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
      footer={
        <p className="m-0">
          {s.rememberedIt}{" "}
          <Link href="/login" className={authLink}>
            {s.backToSignIn}
          </Link>
        </p>
      }
    >
      {error && <AuthNotice tone="problem">{error}</AuthNotice>}

      {step === "REQUEST" && (
        <form onSubmit={handleRequest} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label htmlFor="fp-email" className={authLabel}>
              {s.email}
            </label>
            <input
              id="fp-email"
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
          <button type="submit" className={cn(authPrimaryButton, "mt-1")} disabled={loading}>
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
            ) : (
              <KeyRound className="w-5 h-5" aria-hidden="true" />
            )}
            <span>{s.sendMeACode}</span>
          </button>
        </form>
      )}

      {step === "RESET" && (
        <form onSubmit={handleReset} className="flex flex-col gap-4">
          {devCodeHint && (
            <AuthNotice tone="good">
              {s.devCodeNotice}{" "}
              <strong className="font-mono" dir="ltr">
                {devCodeHint}
              </strong>
            </AuthNotice>
          )}
          <div className="flex flex-col gap-2">
            <label htmlFor="fp-code" className={authLabel}>
              {s.codeLabel}
            </label>
            <input
              id="fp-code"
              inputMode="numeric"
              autoComplete="one-time-code"
              dir="ltr"
              placeholder="123456"
              value={resetCode}
              onChange={(e) => setResetCode(e.target.value)}
              className={cn(authField, "font-mono tracking-[0.3em]")}
              required
            />
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="fp-pass" className={authLabel}>
              {s.newPassword}
            </label>
            <div className="relative">
              <input
                id="fp-pass"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                placeholder={s.passwordHint}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
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
              <KeyRound className="w-5 h-5" aria-hidden="true" />
            )}
            <span>{s.saveNewPassword}</span>
          </button>
        </form>
      )}

      {step === "DONE" && (
        <>
          <AuthNotice tone="good">{s.resetDone}</AuthNotice>
          <button type="button" className={authPrimaryButton} onClick={() => router.push("/login")}>
            {s.goToSignIn}
          </button>
        </>
      )}
    </AuthSplitLayout>
  );
}
