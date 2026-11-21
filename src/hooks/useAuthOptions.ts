"use client";

import { useQuery } from "@tanstack/react-query";
import type { AuthOptions } from "@/lib/auth/config";

const HIDDEN: AuthOptions = { demoLogin: false, googleSignIn: false, passwordReset: false };

/** Which sign-in options work on this deployment (hidden until known, so nothing broken flashes). */
export function useAuthOptions(): AuthOptions {
  const { data } = useQuery({
    queryKey: ["auth_options"],
    queryFn: async (): Promise<AuthOptions> => {
      const res = await fetch("/api/auth/options");
      return res.ok ? ((await res.json()) as AuthOptions) : HIDDEN;
    },
    staleTime: 5 * 60_000,
  });
  return data ?? HIDDEN;
}
