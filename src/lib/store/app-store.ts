import { create } from "zustand";
import type { WeatherAlertThresholds } from "@/types/agri";

export type MapToolMode = "INSPECT" | "DROP_PIN" | "DRAW_BOUNDARY";

interface AppState {
  activeFarmId: string | null;
  setActiveFarmId: (id: string | null) => void;
  isOnline: boolean;
  setIsOnline: (online: boolean) => void;
  pendingSyncCount: number;
  setPendingSyncCount: (count: number) => void;
  conflictCount: number;
  setConflictCount: (count: number) => void;
  lastSyncedAt: string | null;
  setLastSyncedAt: (iso: string | null) => void;
  mapToolMode: MapToolMode;
  setMapToolMode: (mode: MapToolMode) => void;
  alertThresholds: WeatherAlertThresholds;
  setAlertThresholds: (thresholds: Partial<WeatherAlertThresholds>) => void;
}

export const useAppStore = create<AppState>((set) => ({
  activeFarmId: "farm_mitidja_01",
  setActiveFarmId: (id) => set({ activeFarmId: id }),
  isOnline: true,
  setIsOnline: (online) => set({ isOnline: online }),
  pendingSyncCount: 0,
  setPendingSyncCount: (count) => set({ pendingSyncCount: count }),
  conflictCount: 0,
  setConflictCount: (count) => set({ conflictCount: count }),
  lastSyncedAt: null,
  setLastSyncedAt: (iso) => set({ lastSyncedAt: iso }),
  mapToolMode: "INSPECT",
  setMapToolMode: (mode) => set({ mapToolMode: mode }),
  alertThresholds: {
    frostMinTempC: 2,
    heatMaxTempC: 35,
    highWindKmh: 35,
    heavyRainMm: 25,
    highEt0Mm: 6.5,
  },
  setAlertThresholds: (partial) =>
    set((state) => ({
      alertThresholds: { ...state.alertThresholds, ...partial },
    })),
}));
