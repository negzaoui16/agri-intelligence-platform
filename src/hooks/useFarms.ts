"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  cacheAnalysisLocally,
  cacheFarmsLocally,
  cacheReportsLocally,
  deleteFarmOfflineFirst,
  flushSyncQueue,
  getLocalAnalysis,
  getLocalFarms,
  getLocalReports,
  getPendingSyncCount,
  getSyncConflicts,
  resolveConflictItem,
  saveFarmOfflineFirst,
} from "@/lib/offline/sync-engine";
import { useAppStore } from "@/lib/store/app-store";
import type {
  CompleteFarmAnalysisBundle,
  FarmRecord,
  FeasibilityReportPayload,
} from "@/types/agri";

// These hooks read and write the phone's own copy when there is no internet, so they must
// keep running offline. React Query's default ("online") would pause them instead, and a
// farmer opening the app without signal would see no farm at all.
const OFFLINE_FIRST = { networkMode: "always" } as const;

export function useFarms() {
  const isOnline = useAppStore((s) => s.isOnline);
  const activeFarmId = useAppStore((s) => s.activeFarmId);
  const setActiveFarmId = useAppStore((s) => s.setActiveFarmId);

  const query = useQuery<FarmRecord[]>({
    ...OFFLINE_FIRST,
    queryKey: ["farms", isOnline],
    queryFn: async () => {
      if (isOnline) {
        try {
          const res = await fetch("/api/farms");
          if (res.ok) {
            const json = (await res.json()) as { farms: FarmRecord[] };
            await cacheFarmsLocally(json.farms);
            const local = await getLocalFarms();
            // Merge any unsynced local-only farms
            const serverIds = new Set(json.farms.map((f) => f.id));
            const unsynced = local.filter(
              (f) => f.syncStatus !== "SYNCED" || !serverIds.has(f.id)
            );
            const merged = [
              ...unsynced,
              ...json.farms.filter((sf) => !unsynced.some((uf) => uf.id === sf.id)),
            ];
            if (merged.length > 0 && !merged.some((f) => f.id === activeFarmId)) {
              setActiveFarmId(merged[0].id);
            }
            return merged;
          }
        } catch {
          // Fall back to IndexedDB
        }
      }
      const cached = await getLocalFarms();
      if (cached.length > 0 && !cached.some((f) => f.id === activeFarmId)) {
        setActiveFarmId(cached[0].id);
      }
      return cached;
    },
    staleTime: 30_000,
  });

  const farms = query.data ?? [];
  const activeFarm = farms.find((f) => f.id === activeFarmId) ?? farms[0] ?? null;

  return {
    ...query,
    farms,
    activeFarm,
    activeFarmId: activeFarm?.id ?? activeFarmId,
    setActiveFarmId,
  };
}

export function useSaveFarm() {
  const queryClient = useQueryClient();
  const isOnline = useAppStore((s) => s.isOnline);
  const setPendingSyncCount = useAppStore((s) => s.setPendingSyncCount);
  const setActiveFarmId = useAppStore((s) => s.setActiveFarmId);
  const setLastSyncedAt = useAppStore((s) => s.setLastSyncedAt);

  return useMutation({
    ...OFFLINE_FIRST,
    mutationFn: async (params: { farm: FarmRecord; isNew?: boolean }) => {
      const action = params.isNew ? "CREATE" : "UPDATE";
      await saveFarmOfflineFirst(params.farm, action);
      setActiveFarmId(params.farm.id);

      if (isOnline) {
        const res = await flushSyncQueue();
        if (res.applied > 0) {
          setLastSyncedAt(new Date().toISOString());
        }
      }
      setPendingSyncCount(await getPendingSyncCount());
      return params.farm;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["farms"] });
    },
  });
}

export function useDeleteFarm() {
  const queryClient = useQueryClient();
  const isOnline = useAppStore((s) => s.isOnline);
  const setPendingSyncCount = useAppStore((s) => s.setPendingSyncCount);

  return useMutation({
    ...OFFLINE_FIRST,
    mutationFn: async (farmId: string) => {
      await deleteFarmOfflineFirst(farmId);
      if (isOnline) {
        await flushSyncQueue();
      }
      setPendingSyncCount(await getPendingSyncCount());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["farms"] });
    },
  });
}

export function useFarmAnalysis(farm: FarmRecord | null) {
  const isOnline = useAppStore((s) => s.isOnline);

  return useQuery<CompleteFarmAnalysisBundle | null>({
    ...OFFLINE_FIRST,
    queryKey: ["farm_analysis", farm?.id, isOnline],
    enabled: Boolean(farm?.id),
    queryFn: async () => {
      if (!farm) return null;
      const cached = await getLocalAnalysis(farm.id);

      if (!isOnline) {
        return cached;
      }

      // Check server cache first, otherwise run fresh multi-engine analysis
      try {
        const detailRes = await fetch(`/api/farms/${farm.id}`);
        if (detailRes.ok) {
          const detailJson = await detailRes.json();
          if (detailJson.analysis) {
            await cacheAnalysisLocally(detailJson.analysis);
            return detailJson.analysis as CompleteFarmAnalysisBundle;
          }
        }
      } catch {
        // Ignore and compute
      }

      const analyzeRes = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ farmId: farm.id }),
      });
      if (!analyzeRes.ok) {
        if (cached) return cached;
        throw new Error("Analysis request failed");
      }
      const json = (await analyzeRes.json()) as { analysis: CompleteFarmAnalysisBundle };
      await cacheAnalysisLocally(json.analysis);
      return json.analysis;
    },
    staleTime: 10 * 60 * 1000,
    retry: 1,
  });
}

export function useRefreshFarmAnalysis() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (farmId: string) => {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ farmId }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Analysis failed");
      }
      const json = (await res.json()) as { analysis: CompleteFarmAnalysisBundle };
      await cacheAnalysisLocally(json.analysis);
      return json.analysis;
    },
    onSuccess: (analysis) => {
      queryClient.setQueryData(["farm_analysis", analysis.farmId, true], analysis);
      queryClient.invalidateQueries({ queryKey: ["farms"] });
    },
  });
}

export function useReports(farmId?: string) {
  const isOnline = useAppStore((s) => s.isOnline);

  return useQuery<FeasibilityReportPayload[]>({
    ...OFFLINE_FIRST,
    queryKey: ["reports", farmId, isOnline],
    queryFn: async () => {
      if (isOnline) {
        try {
          const url = farmId ? `/api/reports?farmId=${encodeURIComponent(farmId)}` : "/api/reports";
          const res = await fetch(url);
          if (res.ok) {
            const json = (await res.json()) as { reports: FeasibilityReportPayload[] };
            await cacheReportsLocally(json.reports);
            return json.reports;
          }
        } catch {
          // Fall back to local reports
        }
      }
      return getLocalReports(farmId);
    },
  });
}

export function useSyncController() {
  const queryClient = useQueryClient();
  const setPendingSyncCount = useAppStore((s) => s.setPendingSyncCount);
  const setConflictCount = useAppStore((s) => s.setConflictCount);
  const setLastSyncedAt = useAppStore((s) => s.setLastSyncedAt);

  const syncNow = async () => {
    const outcome = await flushSyncQueue();
    setPendingSyncCount(await getPendingSyncCount());
    const conflicts = await getSyncConflicts();
    setConflictCount(conflicts.length);
    if (outcome.applied > 0 || conflicts.length === 0) {
      setLastSyncedAt(new Date().toISOString());
    }
    queryClient.invalidateQueries({ queryKey: ["farms"] });
    return outcome;
  };

  const resolveConflict = async (
    seq: number,
    resolution: "KEEP_LOCAL" | "ACCEPT_SERVER"
  ) => {
    await resolveConflictItem(seq, resolution);
    setPendingSyncCount(await getPendingSyncCount());
    const conflicts = await getSyncConflicts();
    setConflictCount(conflicts.length);
    queryClient.invalidateQueries({ queryKey: ["farms"] });
  };

  return { syncNow, resolveConflict };
}
