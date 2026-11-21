"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import * as React from "react";
import { LanguageProvider } from "@/components/i18n/LanguageProvider";
import {
  flushSyncQueue,
  getPendingSyncCount,
  getSyncConflicts,
} from "@/lib/offline/sync-engine";
import { useAppStore } from "@/lib/store/app-store";

export function AppProviders({ children }: { children: React.ReactNode }) {
  const [queryClient] = React.useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      })
  );

  const setIsOnline = useAppStore((s) => s.setIsOnline);
  const setPendingSyncCount = useAppStore((s) => s.setPendingSyncCount);
  const setConflictCount = useAppStore((s) => s.setConflictCount);
  const setLastSyncedAt = useAppStore((s) => s.setLastSyncedAt);

  React.useEffect(() => {
    if (typeof window === "undefined") return;

    // Register Service Worker for offline PWA behavior
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    }

    const refreshCounters = async () => {
      setPendingSyncCount(await getPendingSyncCount());
      setConflictCount((await getSyncConflicts()).length);
    };

    const handleOnline = async () => {
      setIsOnline(true);
      const outcome = await flushSyncQueue();
      if (outcome.applied > 0) {
        setLastSyncedAt(new Date().toISOString());
        queryClient.invalidateQueries({ queryKey: ["farms"] });
      }
      await refreshCounters();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    setIsOnline(navigator.onLine);
    refreshCounters();
    if (navigator.onLine) {
      flushSyncQueue().then(refreshCounters).catch(() => undefined);
    }

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [queryClient, setConflictCount, setIsOnline, setLastSyncedAt, setPendingSyncCount]);

  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      <LanguageProvider>
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}
