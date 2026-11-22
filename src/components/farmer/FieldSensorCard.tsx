"use client";

import * as React from "react";
import {
  AlertTriangle,
  Bluetooth,
  Check,
  Copy,
  Droplet,
  Gauge,
  Loader2,
  Plus,
  Power,
  Radio,
  Thermometer,
  Trash2,
  X,
} from "lucide-react";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import { useBluetoothSensor } from "@/hooks/useBluetoothSensor";
import {
  useCreateSensorDevice,
  useRevokeSensorDevice,
} from "@/hooks/useFarmSensors";
import { fillTemplate } from "@/lib/i18n/farm-ui-strings";
import { SCREEN_STRINGS, type ScreenStrings } from "@/lib/i18n/screen-strings";
import { SENSOR_STALE_AFTER_MS, SOIL_DRY_THRESHOLD_PCT } from "@/lib/services/farmer-metrics";
import type { FarmSensorsBundle, SensorReadingRecord } from "@/types/agri";
import { cn } from "@/lib/utils";

function soilLabel(pct: number, s: ScreenStrings): string {
  if (pct < SOIL_DRY_THRESHOLD_PCT) return s.soilDryLabel;
  if (pct < 70) return s.soilGoodLabel;
  return s.soilWetLabel;
}

function tankLabel(pct: number, s: ScreenStrings): string {
  if (pct <= 5) return s.tankEmptyLabel;
  if (pct < 25) return s.tankLowLabel;
  if (pct >= 90) return s.tankFullLabel;
  return s.tankGoodLabel;
}

function formatAgeLabel(reading: SensorReadingRecord, nowMs: number, s: ScreenStrings): {
  isStale: boolean;
  label: string;
} {
  const ts = new Date(reading.recordedAt || reading.receivedAt).getTime();
  const diffMs = Number.isFinite(ts) ? Math.max(0, nowMs - ts) : Number.POSITIVE_INFINITY;
  const isStale = diffMs >= SENSOR_STALE_AFTER_MS;
  const mins = Math.max(0, Math.round(diffMs / 60_000));
  const label =
    mins < 1 ? s.lastUpdateJustNow : fillTemplate(s.lastUpdateMinAgo, { minutes: mins });
  return { isStale, label };
}

export function FieldSensorCard({
  farmId,
  sensors,
}: {
  farmId: string;
  sensors: FarmSensorsBundle | null | undefined;
}) {
  const { lang } = useLanguage();
  const s = SCREEN_STRINGS[lang];
  const bt = useBluetoothSensor(farmId);
  const createDevice = useCreateSensorDevice(farmId);
  const revokeDevice = useRevokeSensorDevice(farmId);

  const [modalOpen, setModalOpen] = React.useState(false);
  const [sensorName, setSensorName] = React.useState("");
  const [createdKey, setCreatedKey] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState(false);
  const [nowMs, setNowMs] = React.useState(() => Date.now());

  React.useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  const devices = sensors?.devices ?? [];
  const latest = sensors?.latestReading ?? null;
  const hasDevice = devices.length > 0 || bt.connected;
  const ageInfo = latest ? formatAgeLabel(latest, nowMs, s) : null;
  const isStale = Boolean(!bt.connected && hasDevice && ageInfo?.isStale);

  const openAddModal = () => {
    setSensorName("");
    setCreatedKey(null);
    setCopied(false);
    createDevice.reset();
    setModalOpen(true);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await createDevice.mutateAsync(sensorName.trim() || "Field sensor");
      setCreatedKey(res.deviceKey);
    } catch {
      // Displayed via createDevice.isError
    }
  };

  const handleCopyKey = async () => {
    if (!createdKey) return;
    try {
      await navigator.clipboard.writeText(createdKey);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback: ignore if clipboard is restricted
    }
  };

  return (
    <>
      <section
        data-testid="field-sensor-card"
        className="tp-card bg-[var(--tp-bg-FFFFFF)] border-[1.5px] border-[var(--tp-bd-E4DFD2)] rounded-[20px] lg:rounded-[22px] p-[18px] lg:px-[26px] lg:py-5 flex flex-col gap-3.5"
      >
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="w-10 h-10 rounded-[12px] bg-[var(--tp-bg-E3EFE2)] text-[var(--tp-fg-2E6B3A)] flex items-center justify-center shrink-0">
              <Radio className="w-5 h-5" strokeWidth={2.2} aria-hidden="true" />
            </span>
            <h2 className="m-0 text-[20px] lg:text-[22px] font-bold text-[var(--tp-fg-17251C)]">
              {s.rightNowInField}
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {bt.connected && (
              <span className="text-[15px] font-bold px-3 py-1 rounded-full bg-[var(--tp-bg-E3EFE2)] text-[var(--tp-fg-1F4D28)] inline-flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[var(--tp-bg-2E6B3A)] tp-live-dot" aria-hidden="true" />
                <Bluetooth className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>{s.bluetoothConnectedBadge}</span>
              </span>
            )}
            {ageInfo && (
              <span
                className={cn(
                  "text-[15px] font-bold px-3 py-1 rounded-full inline-flex items-center gap-1.5",
                  isStale
                    ? "bg-[var(--tp-bg-FCEFD9)] text-[var(--tp-fg-8A4B00)]"
                    : "bg-[var(--tp-bg-E3EFE2)] text-[var(--tp-fg-1F4D28)]"
                )}
              >
                {!isStale && (
                  <span className="w-2 h-2 rounded-full bg-[var(--tp-bg-2E6B3A)] tp-live-dot" aria-hidden="true" />
                )}
                <span>{ageInfo.label}</span>
              </span>
            )}
            {bt.isSupported && (
              bt.connected ? (
                <button
                  type="button"
                  onClick={bt.disconnectBluetooth}
                  className="min-h-[44px] px-4 rounded-full border-[1.5px] border-[var(--tp-bd-C9C3B3)] bg-[var(--tp-bg-FFFFFF)] text-[16px] font-bold text-[var(--tp-fg-8A4B00)] inline-flex items-center gap-1.5 hover:bg-[var(--tp-bg-FCEFD9)]"
                >
                  <Bluetooth className="w-4 h-4 shrink-0" strokeWidth={2.3} aria-hidden="true" />
                  <span>{s.disconnectBluetoothBtn}</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => void bt.connectBluetooth()}
                  disabled={bt.connecting}
                  className="min-h-[44px] px-4 rounded-full bg-[var(--tp-bg-1D4F91)] text-white text-[16px] font-bold inline-flex items-center gap-1.5 hover:opacity-95 disabled:opacity-60"
                >
                  {bt.connecting ? (
                    <Loader2 className="w-4 h-4 animate-spin shrink-0" aria-hidden="true" />
                  ) : (
                    <Bluetooth className="w-4 h-4 shrink-0" strokeWidth={2.3} aria-hidden="true" />
                  )}
                  <span>{bt.connecting ? s.connectingBluetooth : s.connectBluetoothBtn}</span>
                </button>
              )
            )}
            <button
              type="button"
              onClick={openAddModal}
              className={cn(
                "min-h-[44px] px-4 rounded-full text-[16px] font-bold inline-flex items-center gap-1.5 transition-colors",
                hasDevice || bt.isSupported
                  ? "border-[1.5px] border-[var(--tp-bd-C9C3B3)] bg-[var(--tp-bg-FFFFFF)] text-[var(--tp-fg-17251C)] hover:bg-[var(--tp-bg-F6F4EE)]"
                  : "bg-[var(--tp-bg-2E6B3A)] text-white hover:bg-[var(--tp-bg-23542D)]"
              )}
            >
              <Plus className="w-4 h-4 shrink-0" strokeWidth={2.4} aria-hidden="true" />
              <span>{hasDevice ? s.addAnotherSensor : s.addASensor}</span>
            </button>
          </div>
        </div>

        {bt.error && (
          <div
            role="alert"
            className="rounded-[16px] bg-[var(--tp-bg-FCEFD9)] border-[1.5px] border-[var(--tp-bd-E2B66B)] px-4 py-3 text-[16px] font-bold text-[var(--tp-fg-8A4B00)]"
          >
            {s.bluetoothConnectionFailed}
          </div>
        )}

        {!hasDevice && !latest && (
          <div className="flex flex-col gap-1.5">
            <p className="m-0 text-[16px] lg:text-[17px] leading-[1.45] text-[var(--tp-fg-4A5A4F)]">
              {s.noSensorYetBody}
            </p>
            {!bt.isSupported && (
              <p className="m-0 text-[15px] text-[var(--tp-fg-4A5A4F)]">
                {s.bluetoothUnsupportedHint}
              </p>
            )}
          </div>
        )}

        {devices.length > 0 && !latest && (
          <div className="rounded-[16px] bg-[var(--tp-bg-F6F4EE)] border-[1.5px] border-[var(--tp-bd-E4DFD2)] p-4 flex flex-wrap items-center justify-between gap-3">
            <p className="m-0 text-[16px] lg:text-[17px] text-[var(--tp-fg-17251C)]">
              <b className="me-2">{devices[0].name}:</b>
              {s.sensorConnectedWaiting}
            </p>
            <button
              type="button"
              onClick={() => revokeDevice.mutate(devices[0].id)}
              disabled={revokeDevice.isPending}
              className="min-h-[40px] px-3 rounded-full text-[15px] font-bold text-[var(--tp-fg-8A4B00)] hover:bg-[var(--tp-bg-FCEFD9)] inline-flex items-center gap-1.5"
            >
              <Trash2 className="w-4 h-4" aria-hidden="true" />
              <span>{s.removeSensorBtn}</span>
            </button>
          </div>
        )}

        {isStale && (
          <div
            role="status"
            className="rounded-[16px] bg-[var(--tp-bg-FCEFD9)] border-[1.5px] border-[var(--tp-bd-E2B66B)] px-4 py-3 flex items-start gap-3"
          >
            <AlertTriangle
              className="w-6 h-6 text-[var(--tp-fg-8A4B00)] shrink-0 mt-0.5"
              strokeWidth={2.2}
              aria-hidden="true"
            />
            <div className="flex flex-col gap-0.5 min-w-0">
              <b className="text-[17px] text-[var(--tp-fg-8A4B00)]">{s.sensorNotSending}</b>
              <span className="text-[16px] leading-[1.4] text-[var(--tp-fg-3B3020)]">
                {s.sensorNotSendingBody}
              </span>
            </div>
          </div>
        )}

        {latest && (
          <div
            className={cn(
              "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3",
              isStale && "opacity-75"
            )}
          >
            {/* 1. Soil wetness (or soil wire fault alert) */}
            <div
              className={cn(
                "rounded-[16px] border-[1.5px] p-3.5 flex flex-col gap-1.5",
                latest.soilFault
                  ? "bg-[var(--tp-bg-FCEFD9)] border-[var(--tp-bd-E2B66B)]"
                  : "bg-[var(--tp-bg-F6F4EE)] border-[var(--tp-bd-E4DFD2)]"
              )}
            >
              <div className="flex items-center gap-2 text-[16px] font-bold text-[var(--tp-fg-4A5A4F)]">
                <Droplet className="w-5 h-5 text-[var(--tp-fg-1D4F91)] shrink-0" aria-hidden="true" />
                <span>{s.soilWetness}</span>
              </div>
              {latest.soilFault ? (
                <p className="m-0 text-[16px] font-bold leading-snug text-[var(--tp-fg-8A4B00)]">
                  {s.soilWireProblem}
                </p>
              ) : (
                <>
                  <b className="tp-tabular text-[26px] leading-tight text-[var(--tp-fg-17251C)]">
                    {latest.soilMoisturePct !== null
                      ? `${Math.round(latest.soilMoisturePct)}%`
                      : "—"}
                  </b>
                  {latest.soilMoisturePct !== null && (
                    <>
                      <div className="h-2 w-full rounded-full bg-[var(--tp-bg-FFFFFF)] border border-[var(--tp-bd-E4DFD2)] overflow-hidden">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all duration-500",
                            latest.soilMoisturePct < 30
                              ? "bg-[var(--tp-bg-C98A1B)]"
                              : latest.soilMoisturePct > 70
                                ? "bg-[var(--tp-bg-1D4F91)]"
                                : "bg-[var(--tp-bg-2E6B3A)]"
                          )}
                          style={{ width: `${Math.min(100, Math.max(4, Math.round(latest.soilMoisturePct)))}%` }}
                        />
                      </div>
                      <span className="text-[15px] font-bold text-[var(--tp-fg-22392A)]">
                        {soilLabel(latest.soilMoisturePct, s)}
                      </span>
                    </>
                  )}
                </>
              )}
            </div>

            {/* 2. Air temperature & humidity */}
            <div className="rounded-[16px] bg-[var(--tp-bg-F6F4EE)] border-[1.5px] border-[var(--tp-bd-E4DFD2)] p-3.5 flex flex-col gap-1.5">
              <div className="flex items-center gap-2 text-[16px] font-bold text-[var(--tp-fg-4A5A4F)]">
                <Thermometer className="w-5 h-5 text-[var(--tp-fg-9A6400)] shrink-0" aria-hidden="true" />
                <span>{s.airTempAndHumidity}</span>
              </div>
              <b className="text-[26px] leading-tight text-[var(--tp-fg-17251C)]">
                {latest.airTempC !== null ? `${Math.round(latest.airTempC)}°C` : "—"}
              </b>
              <span className="text-[16px] text-[var(--tp-fg-4A5A4F)]">
                {latest.airHumidityPct !== null
                  ? `${Math.round(latest.airHumidityPct)}% ${s.airHumidityWord}`
                  : "—"}
              </span>
            </div>

            {/* 3. Water tank level */}
            <div className="rounded-[16px] bg-[var(--tp-bg-F6F4EE)] border-[1.5px] border-[var(--tp-bd-E4DFD2)] p-3.5 flex flex-col gap-1.5">
              <div className="flex items-center gap-2 text-[16px] font-bold text-[var(--tp-fg-4A5A4F)]">
                <Gauge className="w-5 h-5 text-[var(--tp-fg-2E6B3A)] shrink-0" aria-hidden="true" />
                <span>{s.tankLevel}</span>
              </div>
              <b className="tp-tabular text-[26px] leading-tight text-[var(--tp-fg-17251C)]">
                {latest.waterLevelPct !== null ? `${Math.round(latest.waterLevelPct)}%` : "—"}
              </b>
              {latest.waterLevelPct !== null && (
                <>
                  <div className="h-2 w-full rounded-full bg-[var(--tp-bg-FFFFFF)] border border-[var(--tp-bd-E4DFD2)] overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-500",
                        latest.waterLevelPct < 20
                          ? "bg-[var(--tp-bg-C98A1B)]"
                          : "bg-[var(--tp-bg-1D4F91)]"
                      )}
                      style={{ width: `${Math.min(100, Math.max(4, Math.round(latest.waterLevelPct)))}%` }}
                    />
                  </div>
                  <span className="text-[15px] font-bold text-[var(--tp-fg-22392A)]">
                    {tankLabel(latest.waterLevelPct, s)}
                  </span>
                </>
              )}
            </div>

            {/* 4. Pump on / off */}
            <div
              className={cn(
                "rounded-[16px] border-[1.5px] p-3.5 flex flex-col gap-1.5 transition-colors",
                latest.pumpOn
                  ? "bg-[var(--tp-bg-E3EFE2)] border-[var(--tp-bd-7FB083)] ring-2 ring-[var(--tp-bg-2E6B3A)]/20"
                  : "bg-[var(--tp-bg-F6F4EE)] border-[var(--tp-bd-E4DFD2)]"
              )}
            >
              <div className="flex items-center gap-2 text-[16px] font-bold text-[var(--tp-fg-4A5A4F)]">
                <Power
                  className={cn(
                    "w-5 h-5 shrink-0",
                    latest.pumpOn ? "text-[var(--tp-fg-2E6B3A)]" : "text-[var(--tp-fg-4A5A4F)]"
                  )}
                  aria-hidden="true"
                />
                <span>{s.pumpRunningState}</span>
              </div>
              <b
                className={cn(
                  "text-[24px] leading-tight",
                  latest.pumpOn ? "text-[var(--tp-fg-1F4D28)]" : "text-[var(--tp-fg-17251C)]"
                )}
              >
                {latest.pumpOn ? s.pumpOnLabel : s.pumpOffLabel}
              </b>
              <span className="text-[15px] text-[var(--tp-fg-4A5A4F)]">{s.fromYourSensor}</span>
            </div>
          </div>
        )}
      </section>

      {/* Add sensor + show one-time key modal */}
      {modalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-sensor-title"
          className="fixed inset-0 z-50 bg-black/55 flex items-center justify-center p-4"
        >
          <div className="w-full max-w-lg bg-[var(--tp-bg-FFFFFF)] border-[1.5px] border-[var(--tp-bd-E4DFD2)] rounded-[22px] p-5 lg:p-6 flex flex-col gap-4 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <h3
                id="add-sensor-title"
                className="m-0 text-[22px] font-bold text-[var(--tp-fg-17251C)]"
              >
                {createdKey ? s.sensorKeyReadyTitle : s.addSensorModalTitle}
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                aria-label={s.closeBtn}
                className="w-10 h-10 rounded-full border-[1.5px] border-[var(--tp-bd-E4DFD2)] flex items-center justify-center text-[var(--tp-fg-17251C)] shrink-0"
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>

            {!createdKey ? (
              <form onSubmit={handleCreate} className="flex flex-col gap-4">
                <p className="m-0 text-[16px] lg:text-[17px] leading-[1.45] text-[var(--tp-fg-4A5A4F)]">
                  {s.addSensorModalBody}
                </p>

                <label className="flex flex-col gap-1.5 text-[16px] font-bold text-[var(--tp-fg-17251C)]">
                  <span>{s.sensorNameLabel}</span>
                  <input
                    type="text"
                    value={sensorName}
                    onChange={(e) => setSensorName(e.target.value)}
                    placeholder={s.sensorNamePlaceholder}
                    maxLength={80}
                    className="min-h-[50px] px-4 rounded-[14px] border-[1.5px] border-[var(--tp-bd-C9C3B3)] bg-[var(--tp-bg-FFFFFF)] text-[17px] font-normal text-[var(--tp-fg-17251C)]"
                  />
                </label>

                {createDevice.isError && (
                  <p role="alert" className="m-0 text-[16px] font-bold text-[var(--tp-fg-8A4B00)]">
                    {s.sensorCreateError}
                  </p>
                )}

                <div className="flex flex-wrap justify-end gap-2.5 pt-1">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="min-h-[48px] px-5 rounded-full border-[1.5px] border-[var(--tp-bd-C9C3B3)] bg-[var(--tp-bg-FFFFFF)] text-[16px] font-bold text-[var(--tp-fg-17251C)]"
                  >
                    {s.closeBtn}
                  </button>
                  <button
                    type="submit"
                    disabled={createDevice.isPending}
                    className="min-h-[48px] px-6 rounded-full bg-[var(--tp-bg-2E6B3A)] text-white text-[16px] font-bold hover:bg-[var(--tp-bg-23542D)] disabled:opacity-60"
                  >
                    {createDevice.isPending ? s.creatingSensor : s.createSensorBtn}
                  </button>
                </div>
              </form>
            ) : (
              <div className="flex flex-col gap-4">
                <div className="rounded-[14px] bg-[var(--tp-bg-FCEFD9)] border-[1.5px] border-[var(--tp-bd-E2B66B)] px-4 py-3 text-[16px] font-bold text-[var(--tp-fg-8A4B00)]">
                  {s.sensorKeyOnceWarning}
                </div>

                <div className="rounded-[14px] bg-[var(--tp-bg-F6F4EE)] border-[1.5px] border-[var(--tp-bd-E4DFD2)] p-3.5 flex items-center justify-between gap-2">
                  <code className="text-[15px] break-all text-[var(--tp-fg-17251C)] font-mono">
                    {createdKey}
                  </code>
                  <button
                    type="button"
                    onClick={handleCopyKey}
                    className="min-h-[44px] px-4 rounded-full bg-[var(--tp-bg-2E6B3A)] text-white text-[15px] font-bold inline-flex items-center gap-1.5 shrink-0"
                  >
                    {copied ? (
                      <Check className="w-4 h-4" aria-hidden="true" />
                    ) : (
                      <Copy className="w-4 h-4" aria-hidden="true" />
                    )}
                    <span>{copied ? s.keyCopied : s.copyKeyBtn}</span>
                  </button>
                </div>

                <p className="m-0 text-[16px] leading-[1.45] text-[var(--tp-fg-4A5A4F)]">
                  {s.sensorKeyInstructions}
                </p>

                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="self-end min-h-[48px] px-6 rounded-full bg-[var(--tp-bg-17251C)] text-[var(--tp-on-inverse)] text-[16px] font-bold"
                >
                  {s.closeBtn}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
