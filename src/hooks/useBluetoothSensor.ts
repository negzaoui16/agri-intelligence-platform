"use client";

import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { cacheFarmSensorsLocally } from "@/lib/offline/sync-engine";
import { useAppStore } from "@/lib/store/app-store";
import { singleSensorReadingInputSchema } from "@/lib/validation/schemas";
import type { FarmSensorsBundle, SensorReadingRecord } from "@/types/agri";

export const TERRAPULSE_BLE_SERVICE_UUID = "4fafc201-1fb5-459e-8fcc-c5c9c331914b";
export const TERRAPULSE_BLE_CHAR_UUID = "beb5483e-36e1-4688-b7f5-ea07361b26a8";

interface BleCharacteristicLike {
  value?: DataView | null;
  readValue(): Promise<DataView>;
  startNotifications(): Promise<BleCharacteristicLike>;
  addEventListener(type: "characteristicvaluechanged", listener: () => void): void;
  removeEventListener(type: "characteristicvaluechanged", listener: () => void): void;
}

interface BleServiceLike {
  getCharacteristic(uuid: string): Promise<BleCharacteristicLike>;
}

interface BleGattServerLike {
  connected: boolean;
  connect(): Promise<BleGattServerLike>;
  disconnect(): void;
  getPrimaryService(uuid: string): Promise<BleServiceLike>;
}

interface BleDeviceLike {
  id?: string;
  name?: string;
  gatt?: BleGattServerLike;
  addEventListener(type: "gattserverdisconnected", listener: () => void): void;
  removeEventListener(type: "gattserverdisconnected", listener: () => void): void;
}

interface WebBluetoothLike {
  requestDevice(options: {
    filters?: Array<{ services?: string[]; namePrefix?: string }>;
    optionalServices?: string[];
  }): Promise<BleDeviceLike>;
}

function coerceNullableNumber(v: unknown): number | null | undefined {
  if (v === undefined) return undefined;
  if (v === null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

function coerceBoolean(v: unknown): boolean | undefined {
  if (v === undefined) return undefined;
  if (typeof v === "boolean") return v;
  if (v === 1 || v === "1" || v === "true") return true;
  if (v === 0 || v === "0" || v === "false") return false;
  return undefined;
}

export function parseBleSensorPayload(
  rawText: string,
  farmId: string,
  deviceId = "ble_terrapulse_node"
): SensorReadingRecord | null {
  let obj: Record<string, unknown>;
  try {
    const parsed = JSON.parse(rawText.trim());
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    obj = parsed as Record<string, unknown>;
  } catch {
    return null;
  }

  const candidate = {
    airTempC: coerceNullableNumber(obj.t !== undefined ? obj.t : obj.airTempC),
    airHumidityPct: coerceNullableNumber(obj.h !== undefined ? obj.h : obj.airHumidityPct),
    soilRaw: coerceNullableNumber(obj.sr !== undefined ? obj.sr : obj.soilRaw),
    soilMoisturePct: coerceNullableNumber(obj.sm !== undefined ? obj.sm : obj.soilMoisturePct),
    soilFault: coerceBoolean(obj.sf !== undefined ? obj.sf : obj.soilFault),
    waterRaw: coerceNullableNumber(obj.wr !== undefined ? obj.wr : obj.waterRaw),
    waterLevelPct: coerceNullableNumber(obj.wl !== undefined ? obj.wl : obj.waterLevelPct),
    pumpOn: coerceBoolean(obj.p !== undefined ? obj.p : obj.pumpOn),
  };

  const validated = singleSensorReadingInputSchema.safeParse(candidate);
  if (!validated.success) return null;

  const nowIso = new Date().toISOString();
  const d = validated.data;
  return {
    id: `ble_${Date.now()}`,
    deviceId,
    farmId,
    recordedAt: nowIso,
    receivedAt: nowIso,
    airTempC: d.airTempC ?? null,
    airHumidityPct: d.airHumidityPct ?? null,
    soilMoisturePct: d.soilMoisturePct ?? null,
    soilRaw: d.soilRaw ?? null,
    waterLevelPct: d.waterLevelPct ?? null,
    waterRaw: d.waterRaw ?? null,
    pumpOn: d.pumpOn,
    soilFault: d.soilFault,
  };
}

function decodeDataView(view: DataView): string {
  const bytes = new Uint8Array(view.buffer, view.byteOffset, view.byteLength);
  return new TextDecoder("utf-8").decode(bytes);
}

export function useBluetoothSensor(farmId?: string | null) {
  const queryClient = useQueryClient();
  const isOnline = useAppStore((s) => s.isOnline);
  const [mounted, setMounted] = React.useState(false);
  const [connecting, setConnecting] = React.useState(false);
  const [connected, setConnected] = React.useState(false);
  const [deviceName, setDeviceName] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const deviceRef = React.useRef<BleDeviceLike | null>(null);
  const charRef = React.useRef<BleCharacteristicLike | null>(null);
  const pollTimerRef = React.useRef<number | null>(null);
  const lastSyncMsRef = React.useRef<number>(0);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const isSupported =
    mounted &&
    typeof navigator !== "undefined" &&
    Boolean((navigator as Navigator & { bluetooth?: WebBluetoothLike }).bluetooth);

  const cleanupListeners = React.useCallback(() => {
    if (pollTimerRef.current !== null) {
      window.clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
    charRef.current = null;
    deviceRef.current = null;
    setConnected(false);
  }, []);

  const disconnectBluetooth = React.useCallback(() => {
    try {
      if (deviceRef.current?.gatt?.connected) {
        deviceRef.current.gatt.disconnect();
      }
    } catch {
      // Ignore disconnect errors
    }
    cleanupListeners();
    setDeviceName(null);
  }, [cleanupListeners]);

  React.useEffect(() => {
    return () => {
      disconnectBluetooth();
    };
  }, [disconnectBluetooth]);

  const applyReading = React.useCallback(
    async (rawText: string, bleDeviceId: string, bleName: string) => {
      if (!farmId) return;
      const reading = parseBleSensorPayload(rawText, farmId, bleDeviceId);
      if (!reading) return;

      const devSummary = {
        id: bleDeviceId,
        farmId,
        name: `${bleName} (Bluetooth)`,
        createdAt: reading.recordedAt,
        lastSeenAt: reading.receivedAt,
        revokedAt: null,
        latestReading: reading,
      };

      const prevBundle =
        queryClient.getQueryData<FarmSensorsBundle | null>(["farm_sensors", farmId, isOnline]) ??
        queryClient.getQueryData<FarmSensorsBundle | null>(["farm_sensors", farmId, true]) ??
        null;

      const existingDevices = prevBundle?.devices ?? [];
      const mergedDevices = existingDevices.some((d) => d.id === bleDeviceId)
        ? existingDevices.map((d) => (d.id === bleDeviceId ? devSummary : d))
        : [...existingDevices, devSummary];

      const nextBundle: FarmSensorsBundle = {
        farmId,
        devices: mergedDevices,
        latestReading: reading,
        readings24h: [reading, ...(prevBundle?.readings24h ?? [])].slice(0, 200),
      };

      queryClient.setQueriesData<FarmSensorsBundle | null>(
        { queryKey: ["farm_sensors", farmId] },
        nextBundle
      );
      void cacheFarmSensorsLocally(nextBundle);

      const now = Date.now();
      if (isOnline && now - lastSyncMsRef.current >= 15_000) {
        lastSyncMsRef.current = now;
        try {
          const res = await fetch(`/api/farms/${encodeURIComponent(farmId)}/sensors`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              deviceName: `${bleName} (Bluetooth)`,
              reading: {
                airTempC: reading.airTempC,
                airHumidityPct: reading.airHumidityPct,
                soilRaw: reading.soilRaw,
                soilMoisturePct: reading.soilMoisturePct,
                soilFault: reading.soilFault,
                waterRaw: reading.waterRaw,
                waterLevelPct: reading.waterLevelPct,
                pumpOn: reading.pumpOn,
              },
            }),
          });
          if (res.ok) {
            const serverBundle = (await res.json()) as FarmSensorsBundle;
            queryClient.setQueriesData<FarmSensorsBundle | null>(
              { queryKey: ["farm_sensors", farmId] },
              serverBundle
            );
            void cacheFarmSensorsLocally(serverBundle);
          }
        } catch {
          // Keep live Bluetooth UI updating even if server sync fails transiently
        }
      }
    },
    [farmId, isOnline, queryClient]
  );

  const connectBluetooth = React.useCallback(async () => {
    if (!farmId || !isSupported) return;
    const bt = (navigator as Navigator & { bluetooth?: WebBluetoothLike }).bluetooth;
    if (!bt) return;

    setError(null);
    setConnecting(true);
    try {
      const device = await bt.requestDevice({
        filters: [
          { services: [TERRAPULSE_BLE_SERVICE_UUID] },
          { namePrefix: "TerraPulse" },
        ],
        optionalServices: [TERRAPULSE_BLE_SERVICE_UUID],
      });

      const bleName = device.name?.trim() || "TerraPulse-Node";
      const bleId = device.id ? `ble_${device.id}` : "ble_terrapulse_node";
      deviceRef.current = device;

      const onDisconnected = () => {
        cleanupListeners();
      };
      device.addEventListener("gattserverdisconnected", onDisconnected);

      const server = await device.gatt?.connect();
      if (!server) throw new Error("GATT unavailable");

      const service = await server.getPrimaryService(TERRAPULSE_BLE_SERVICE_UUID);
      const characteristic = await service.getCharacteristic(TERRAPULSE_BLE_CHAR_UUID);
      charRef.current = characteristic;
      lastSyncMsRef.current = 0;

      const readOnce = async () => {
        try {
          const dv = await characteristic.readValue();
          await applyReading(decodeDataView(dv), bleId, bleName);
        } catch {
          // Ignore single read hiccup; notifications or next poll will refresh
        }
      };

      const onNotify = () => {
        const dv = characteristic.value;
        if (!dv) return;
        const decoded = decodeDataView(dv);
        // If truncated at 20-byte default ATT MTU, fall back to a full readValue()
        if (decoded.trim().endsWith("}")) {
          void applyReading(decoded, bleId, bleName);
        } else {
          void readOnce();
        }
      };

      await readOnce();
      try {
        await characteristic.startNotifications();
        characteristic.addEventListener("characteristicvaluechanged", onNotify);
      } catch {
        // Polling interval below keeps readings streaming even without notify support
      }

      pollTimerRef.current = window.setInterval(() => {
        if (device.gatt?.connected) {
          void readOnce();
        }
      }, 2500);

      setDeviceName(bleName);
      setConnected(true);
    } catch (err) {
      const name = err instanceof Error ? err.name : "";
      if (name !== "NotFoundError" && name !== "AbortError") {
        setError(err instanceof Error ? err.message : "Bluetooth connection failed");
      }
      cleanupListeners();
    } finally {
      setConnecting(false);
    }
  }, [applyReading, cleanupListeners, farmId, isSupported]);

  return {
    isSupported,
    connecting,
    connected,
    deviceName,
    error,
    connectBluetooth,
    disconnectBluetooth,
  };
}
