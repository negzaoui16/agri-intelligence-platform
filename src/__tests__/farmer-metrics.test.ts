import { describe, expect, it, afterEach } from "vitest";
import { getSessionState } from "@/lib/auth/session";
import { localizeMonthName, MAGHREB_ARABIC_MONTHS } from "@/lib/i18n/translations";
import { buildFeasibilityReport } from "@/lib/services/analysis-orchestrator";
import { selectFarmerMetrics } from "@/lib/services/farmer-metrics";
import type { SensorReadingRecord } from "@/types/agri";
import { makeDemoFarm, makeMockBundle } from "./fixtures/demo-farm";


describe("Farmer-First Shared Metrics & Honest Scoring", () => {
  const originalEnv = process.env.NODE_ENV;

  afterEach(() => {
    (process.env as Record<string, string | undefined>).NODE_ENV = originalEnv;
  });

  it("computes consistent water, sun, and weather metrics across Home, Water, Sun, and Report", () => {
    const farm = makeDemoFarm();
    const bundle = makeMockBundle();
    const m = selectFarmerMetrics(farm, bundle);

    expect(m.pumpDailySupplyM3).toBe(196);
    expect(m.peakDailyDemandM3).toBe(621);
    expect(m.peakMonthName).toBe("July");
    expect(m.isWaterShort).toBe(true);
    expect(m.waterStatus).toBe("PROBLEM");
    expect(m.cupsDenominator).toBe(3);
    expect(m.neededPumpFlowM3Hr).toBe(89);
    expect(m.neededPumpHoursDay).toBe(22);

    expect(m.solarUnitsOutOf10).toBe(6);
    expect(m.isSolarShortInSummer).toBe(true);
    expect(m.sunStatus).toBe("OK");
    expect(m.primaryProblem).toBe("WATER_SHORT");
  });

  it("subtracts score proportionally and adds a July pump-capacity risk in buildFeasibilityReport", () => {
    const bundle = makeMockBundle();
    const adequatePumpFarm = makeDemoFarm({ flowRateM3Hr: 95, operatingHoursDay: 7 });
    const undersizedPumpFarm = makeDemoFarm({ flowRateM3Hr: 28, operatingHoursDay: 7 });

    const adequateReport = buildFeasibilityReport(adequatePumpFarm, bundle);
    const shortReport = buildFeasibilityReport(undersizedPumpFarm, bundle);

    expect(shortReport.overallScore).toBeLessThan(adequateReport.overallScore);
    expect(shortReport.verdict).not.toBe("HIGHLY_FEASIBLE");
    expect(shortReport.risks.some((r) => r.title.includes("Water supply too small in July"))).toBe(
      true
    );
    expect(shortReport.executiveSummary).toContain("Yes, if you solve summer water first");
  });

  it("enforces unauthenticated null session in production when no session cookie exists", async () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = "production";
    const prodState = await getSessionState();
    expect(prodState.user).toBeNull();
    expect(prodState.isAuthenticated).toBe(false);
    expect(prodState.isDemoFallback).toBe(false);

    (process.env as Record<string, string | undefined>).NODE_ENV = "development";
    const devState = await getSessionState();
    expect(devState.user?.id).toBe("user_demo_agronomist");
    expect(devState.isDemoFallback).toBe(true);
  });

  it("uses Maghreb Arabic month names accurately", () => {
    expect(MAGHREB_ARABIC_MONTHS.July).toBe("جويلية");
    expect(localizeMonthName("July", "ar")).toBe("جويلية");
    expect(localizeMonthName("July", "fr")).toBe("juillet");
  });

  it("never shows a guessed month or status before the farm has been checked", () => {
    const m = selectFarmerMetrics(makeDemoFarm(), null);

    expect(m.hasAnalysis).toBe(false);
    expect(m.peakMonthName).toBeNull();
    expect(m.worstMonthName).toBeNull();
    expect(m.todayEt0Mm).toBeNull();
    expect(m.waterStatus).toBe("UNKNOWN");
    expect(m.sunStatus).toBe("UNKNOWN");
    expect(m.weatherStatus).toBe("UNKNOWN");
    expect(m.isWaterShort).toBe(false);
    expect(m.tempSourceLabel).toBe("from the forecast");
    expect(m.waterAdviceSourceLabel).toBe("from the forecast");
  });

  it("uses fresh ESP32 sensor readings for water advice and live temperature, falling back when stale or faulted", () => {
    const farm = makeDemoFarm();
    const bundle = makeMockBundle(); // forecast currentTempC = 28, today precipMm = 0
    const nowMs = Date.UTC(2026, 10, 22, 12, 0, 0);

    // Fresh wet sensor (5 min old) -> skips watering despite 0mm rain forecast, and uses 24C sensor temp
    const freshWet: SensorReadingRecord = {
      id: "sr_wet",
      deviceId: "dev_1",
      farmId: farm.id,
      recordedAt: new Date(nowMs - 5 * 60_000).toISOString(),
      receivedAt: new Date(nowMs - 5 * 60_000).toISOString(),
      airTempC: 24.2,
      airHumidityPct: 55,
      soilMoisturePct: 68,
      soilRaw: 1450,
      waterLevelPct: 80,
      waterRaw: 1640,
      pumpOn: false,
      soilFault: false,
    };
    const mWet = selectFarmerMetrics(farm, bundle, freshWet, nowMs);
    expect(mWet.isSensorFresh).toBe(true);
    expect(mWet.shouldWaterToday).toBe(false);
    expect(mWet.waterAdviceSourceLabel).toBe("from your sensor");
    expect(mWet.currentTempC).toBe(24);
    expect(mWet.tempSourceLabel).toBe("from your sensor");

    // Fresh dry sensor -> advises watering today from sensor
    const freshDry: SensorReadingRecord = {
      ...freshWet,
      id: "sr_dry",
      soilMoisturePct: 22,
      soilRaw: 2500,
    };
    const mDry = selectFarmerMetrics(farm, bundle, freshDry, nowMs);
    expect(mDry.shouldWaterToday).toBe(true);
    expect(mDry.waterAdviceSourceLabel).toBe("from your sensor");

    // Fresh sensor with soilFault=true -> uses sensor air temp, falls back to forecast for watering advice
    const freshFault: SensorReadingRecord = {
      ...freshWet,
      id: "sr_fault",
      soilFault: true,
      soilMoisturePct: null,
      soilRaw: 4095,
    };
    const mFault = selectFarmerMetrics(farm, bundle, freshFault, nowMs);
    expect(mFault.hasSensorFault).toBe(true);
    expect(mFault.waterAdviceSourceLabel).toBe("from the forecast");
    expect(mFault.tempSourceLabel).toBe("from your sensor");

    // Stale sensor (>= 15 min old) -> falls back to forecast for everything
    const stale: SensorReadingRecord = {
      ...freshWet,
      id: "sr_stale",
      recordedAt: new Date(nowMs - 20 * 60_000).toISOString(),
      receivedAt: new Date(nowMs - 20 * 60_000).toISOString(),
    };
    const mStale = selectFarmerMetrics(farm, bundle, stale, nowMs);
    expect(mStale.isSensorStale).toBe(true);
    expect(mStale.isSensorFresh).toBe(false);
    expect(mStale.tempSourceLabel).toBe("from the forecast");
    expect(mStale.waterAdviceSourceLabel).toBe("from the forecast");
    expect(mStale.currentTempC).toBe(Math.round(bundle.weather.current.temperatureC));
    expect(mStale.shouldWaterToday).toBe(true);
  });
});
