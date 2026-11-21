import { describe, expect, it, afterEach } from "vitest";
import { getSessionState } from "@/lib/auth/session";
import { localizeMonthName, MAGHREB_ARABIC_MONTHS } from "@/lib/i18n/translations";
import { buildFeasibilityReport } from "@/lib/services/analysis-orchestrator";
import { selectFarmerMetrics } from "@/lib/services/farmer-metrics";
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
  });
});
