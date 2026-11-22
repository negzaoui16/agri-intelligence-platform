"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { cacheFarmSensorsLocally, getLocalFarmSensors } from "@/lib/offline/sync-engine";
import { useAppStore } from "@/lib/store/app-store";
import type { FarmSensorsBundle, SensorDevicePublicRecord } from "@/types/agri";

// Must keep running offline ("always") like useFarms so the last sensor reading stays visible.
const OFFLINE_FIRST = { networkMode: "always" } as const;

export function useFarmSensors(farmId?: string | null) {
  const isOnline = useAppStore((s) => s.isOnline);

  return useQuery<FarmSensorsBundle | null>({
    ...OFFLINE_FIRST,
    queryKey: ["farm_sensors", farmId, isOnline],
    enabled: Boolean(farmId),
    refetchInterval: 60_000,
    staleTime: 30_000,
    queryFn: async () => {
      if (!farmId) return null;
      if (isOnline) {
        try {
          const res = await fetch(`/api/farms/${encodeURIComponent(farmId)}/sensors`);
          if (res.ok) {
            const bundle = (await res.json()) as FarmSensorsBundle;
            await cacheFarmSensorsLocally(bundle);
            return bundle;
          }
        } catch {
          // Fall back to the last cached sensor reading offline
        }
      }
      return (await getLocalFarmSensors(farmId)) ?? {
        farmId,
        devices: [],
        latestReading: null,
        readings24h: [],
      };
    },
  });
}

export function useCreateSensorDevice(farmId?: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    ...OFFLINE_FIRST,
    mutationFn: async (name: string) => {
      if (!farmId) throw new Error("No active farm");
      const res = await fetch(`/api/farms/${encodeURIComponent(farmId)}/devices`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to add sensor");
      }
      return (await res.json()) as {
        device: SensorDevicePublicRecord;
        deviceKey: string;
        key: string;
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["farm_sensors", farmId] });
    },
  });
}

export function useRevokeSensorDevice(farmId?: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    ...OFFLINE_FIRST,
    mutationFn: async (deviceId: string) => {
      if (!farmId) throw new Error("No active farm");
      const res = await fetch(
        `/api/farms/${encodeURIComponent(farmId)}/devices/${encodeURIComponent(deviceId)}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to remove sensor");
      }
      return (await res.json()) as { revoked: true; deviceId: string };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["farm_sensors", farmId] });
    },
  });
}
