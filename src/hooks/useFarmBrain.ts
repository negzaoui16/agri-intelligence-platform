"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAppStore } from "@/lib/store/app-store";
import type {
  FarmBrainAnalysisRecord,
  SimulationComparisonResult,
  SimulationScenarioInputs,
  SimulationScenarioRecord,
} from "@/types/agri";

const OFFLINE_FIRST = { networkMode: "always" } as const;

const CACHE_BRAIN_PREFIX = "tp_farmbrain_overview_";
const CACHE_SCENARIOS_PREFIX = "tp_farmbrain_scenarios_";

function readStorage<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: unknown): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage quota errors
  }
}

export function useFarmBrainOverview(farmId?: string | null) {
  const isOnline = useAppStore((s) => s.isOnline);

  return useQuery<{ analysis: FarmBrainAnalysisRecord; mlMetadata?: unknown } | null>({
    ...OFFLINE_FIRST,
    queryKey: ["farmbrain_overview", farmId, isOnline],
    enabled: Boolean(farmId),
    staleTime: 60_000,
    queryFn: async () => {
      if (!farmId) return null;
      if (isOnline) {
        try {
          const res = await fetch(
            `/api/farmbrain/overview?farmId=${encodeURIComponent(farmId)}`
          );
          if (res.ok) {
            const data = (await res.json()) as {
              analysis: FarmBrainAnalysisRecord;
              mlMetadata?: unknown;
            };
            writeStorage(`${CACHE_BRAIN_PREFIX}${farmId}`, data);
            return data;
          }
        } catch {
          // Offline fallback below
        }
      }
      return readStorage<{ analysis: FarmBrainAnalysisRecord; mlMetadata?: unknown }>(
        `${CACHE_BRAIN_PREFIX}${farmId}`
      );
    },
  });
}

export function useRecalculateFarmBrain(farmId?: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    ...OFFLINE_FIRST,
    mutationFn: async (params?: {
      waterTariffTndPerM3?: number | null;
      electricityTariffTndPerKwh?: number | null;
    }) => {
      if (!farmId) throw new Error("No active farm");
      const res = await fetch("/api/farmbrain/recalculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          farmId,
          waterTariffTndPerM3: params?.waterTariffTndPerM3 ?? null,
          electricityTariffTndPerKwh: params?.electricityTariffTndPerKwh ?? null,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to refresh FarmBrain analysis");
      }
      const data = (await res.json()) as { analysis: FarmBrainAnalysisRecord };
      writeStorage(`${CACHE_BRAIN_PREFIX}${farmId}`, { analysis: data.analysis });
      return data.analysis;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["farmbrain_overview", farmId] });
    },
  });
}

export function useSimulationScenarios(farmId?: string | null) {
  const isOnline = useAppStore((s) => s.isOnline);

  return useQuery<SimulationScenarioRecord[]>({
    ...OFFLINE_FIRST,
    queryKey: ["farmbrain_scenarios", farmId, isOnline],
    enabled: Boolean(farmId),
    staleTime: 30_000,
    queryFn: async () => {
      if (!farmId) return [];
      if (isOnline) {
        try {
          const res = await fetch(
            `/api/simulator/scenarios?farmId=${encodeURIComponent(farmId)}`
          );
          if (res.ok) {
            const json = (await res.json()) as { scenarios: SimulationScenarioRecord[] };
            writeStorage(`${CACHE_SCENARIOS_PREFIX}${farmId}`, json.scenarios);
            return json.scenarios;
          }
        } catch {
          // Offline fallback
        }
      }
      return readStorage<SimulationScenarioRecord[]>(`${CACHE_SCENARIOS_PREFIX}${farmId}`) ?? [];
    },
  });
}

export function useCreateAndRunScenario(farmId?: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    ...OFFLINE_FIRST,
    mutationFn: async (params: { name: string; inputs: SimulationScenarioInputs }) => {
      if (!farmId) throw new Error("No active farm");
      const res = await fetch("/api/simulator/scenarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          farmId,
          name: params.name,
          inputs: params.inputs,
          runImmediately: true,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to run simulation");
      }
      const data = (await res.json()) as { scenario: SimulationScenarioRecord };
      return data.scenario;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["farmbrain_scenarios", farmId] });
    },
  });
}

export function useDeleteSimulationScenario(farmId?: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    ...OFFLINE_FIRST,
    mutationFn: async (scenarioId: string) => {
      const res = await fetch(`/api/simulator/scenarios/${encodeURIComponent(scenarioId)}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to delete scenario");
      }
      return scenarioId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["farmbrain_scenarios", farmId] });
    },
  });
}

export function useCompareScenarios(farmId?: string | null) {
  return useMutation({
    ...OFFLINE_FIRST,
    mutationFn: async (scenarioIds: string[]) => {
      if (!farmId) throw new Error("No active farm");
      const res = await fetch("/api/simulator/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ farmId, scenarioIds }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to compare scenarios");
      }
      const json = (await res.json()) as { comparison: SimulationComparisonResult };
      return json.comparison;
    },
  });
}
