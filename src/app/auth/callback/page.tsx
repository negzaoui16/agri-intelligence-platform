"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthSplitLayout } from "@/components/auth/AuthSplitLayout";
import { Badge, Button, Input } from "@/components/ui/primitives";
import { useQueryClient } from "@tanstack/react-query";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";

export default function AuthCallbackPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

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
        body: JSON.stringify({
          email: email.trim(),
          name: name.trim(),
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Unable to complete Google sign-in.");
        return;
      }
      await queryClient.invalidateQueries({ queryKey: ["auth_session"] });
      await queryClient.invalidateQueries({ queryKey: ["farms"] });
      router.push(json.redirectTo || "/onboarding");
      router.refresh();
    } catch {
      setError("Network error completing Google OAuth callback.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthSplitLayout
      title="Google Sign-In Callback"
      subtitle="Connect your Google account to create or access your TerraPulse farmer workspace."
    >
      <div className="p-3.5 rounded-xl bg-muted border border-border text-xs space-y-1.5">
        <Badge variant="blue">Google OAuth 2.0 Integration</Badge>
        <p className="text-muted-foreground">
          When <code>GOOGLE_CLIENT_ID</code> and <code>GOOGLE_CLIENT_SECRET</code> are configured in <code>.env.local</code>, this callback completes automatically with Google OAuth. In local/dev mode without Google keys, confirm your Google profile below to continue.
        </p>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-300 text-xs flex items-center gap-2 text-red-900">
          <AlertCircle className="h-4 w-4" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleGoogleComplete} className="space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="g-name" className="text-xs font-medium">
            Google Account Full Name
          </label>
          <Input
            id="g-name"
            placeholder="Youssef Mansouri"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-11"
            required
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="g-email" className="text-xs font-medium">
            Google Email Address
          </label>
          <Input
            id="g-email"
            type="email"
            inputMode="email"
            placeholder="youssef@gmail.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-11"
            required
          />
        </div>
        <Button type="submit" size="lg" variant="primary" className="w-full" disabled={loading}>
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <CheckCircle2 className="h-4 w-4" />
          )}
          <span>Complete Google Sign-In</span>
        </Button>
      </form>

      <p className="text-xs text-center text-muted-foreground">
        <Link href="/login" className="underline">
          Return to Sign In
        </Link>
      </p>
    </AuthSplitLayout>
  );
}
