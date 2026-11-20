"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { clearUserLocalCacheOnLogout } from "@/lib/offline/sync-engine";
import type { SessionUser } from "@/lib/auth/session";
import type { FarmerProfileRecord, OnboardingProgressRecord } from "@/types/agri";

export interface SessionApiResponse {
  user: SessionUser | null;
  isAuthenticated: boolean;
  isExpired: boolean;
  isDemoFallback: boolean;
  farmerProfile: FarmerProfileRecord | null;
  onboardingProgress: OnboardingProgressRecord | null;
}

export function useAuthSession() {
  const queryClient = useQueryClient();
  const router = useRouter();

  const query = useQuery<SessionApiResponse>({
    queryKey: ["auth_session"],
    queryFn: async () => {
      const res = await fetch("/api/auth/session");
      if (!res.ok) {
        return {
          user: null,
          isAuthenticated: false,
          isExpired: false,
          isDemoFallback: false,
          farmerProfile: null,
          onboardingProgress: null,
        };
      }
      return res.json();
    },
    staleTime: 30_000,
  });

  const logout = async () => {
    await fetch("/api/auth/session", { method: "DELETE" });
    await clearUserLocalCacheOnLogout().catch(() => undefined);
    queryClient.clear();
    router.push("/login");
    router.refresh();
  };

  return {
    ...query,
    user: query.data?.user ?? null,
    isAuthenticated: query.data?.isAuthenticated ?? false,
    isExpired: query.data?.isExpired ?? false,
    isDemoFallback: query.data?.isDemoFallback ?? false,
    farmerProfile: query.data?.farmerProfile ?? null,
    onboardingProgress: query.data?.onboardingProgress ?? null,
    logout,
  };
}
