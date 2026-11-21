"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2 } from "lucide-react";
import {
  AuthNotice,
  AuthSplitLayout,
  authField,
  authLabel,
  authLink,
  authPrimaryButton,
} from "@/components/auth/AuthSplitLayout";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import { SCREEN_STRINGS } from "@/lib/i18n/screen-strings";
import { clearUserLocalCacheOnLogout } from "@/lib/offline/sync-engine";
import { cn } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";

/**
 * Local stand-in for Google sign-in, used only on a developer computer without Google keys.
 * The server refuses it in production (see src/lib/auth/config.ts).
 */
export default function AuthCallbackPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { lang } = useLanguage();
  const s = SCREEN_STRINGS[lang];

  const [email, setEmail] = React.useState("");
  const [name, setName] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleGoogleComplete = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/oauth-callback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), name: name.trim() }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(res.status === 429 ? s.tooManyTries : s.googleFailed);
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
      title={s.googleTestTitle}
      subtitle={s.googleTestSubtitle}
      footer={
        <Link href="/login" className={authLink}>
          {s.backToSignIn}
        </Link>
      }
    >
      <AuthNotice tone="good">{s.googleTestNote}</AuthNotice>

      {error && <AuthNotice tone="problem">{error}</AuthNotice>}

      <form onSubmit={handleGoogleComplete} className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <label htmlFor="g-name" className={authLabel}>
            {s.googleName}
          </label>
          <input
            id="g-name"
            autoComplete="name"
            placeholder="Youssef Mansouri"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={authField}
            required
          />
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor="g-email" className={authLabel}>
            {s.googleEmail}
          </label>
          <input
            id="g-email"
            type="email"
            inputMode="email"
            autoComplete="email"
            dir="ltr"
            placeholder="youssef@gmail.com"
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
            <CheckCircle2 className="w-5 h-5" aria-hidden="true" />
          )}
          <span>{s.completeGoogle}</span>
        </button>
      </form>
    </AuthSplitLayout>
  );
}
