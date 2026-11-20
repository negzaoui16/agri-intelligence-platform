import { describe, expect, it } from "vitest";
import {
  calculateHazenWilliamsFrictionLossM,
  calculatePumpEnergy,
} from "@/lib/engines/pump-calculator";

describe("Deterministic Hydraulic Pump Energy Calculator", () => {
  it("computes exact textbook hydraulic and electrical power from P = (rho * g * Q * H) / eta", () => {
    // Q = 36 m3/h = 0.01 m3/s, H = 50 m, combined eff = 60%
    // P_hyd = 1000 * 9.80665 * 0.01 * 50 / 1000 = 4.9033 kW
    // P_elec = 4.9033 / 0.60 = 8.1722 kW
    const result = calculatePumpEnergy({
      flowRateM3Hr: 36,
      staticElevationDiffM: 50,
      pipeLengthM: 100,
      pipeDiameterMm: 110,
      operatingPressureHeadM: 0,
      pumpEfficiencyPct: 60,
      motorEfficiencyPct: 100, // combined = 60% (clamped max 98%, so pass 75% * 80% = 60% below)
      operatingHoursDay: 5,
      overrideTotalDynamicHeadM: 50,
    });

    // Note: motorEfficiencyPct is clamped to <= 98% inside calculator, so let's test explicit 75% * 80% = 60%
    const exactResult = calculatePumpEnergy({
      flowRateM3Hr: 36,
      staticElevationDiffM: 50,
      pipeLengthM: 100,
      pipeDiameterMm: 110,
      operatingPressureHeadM: 0,
      pumpEfficiencyPct: 75,
      motorEfficiencyPct: 80,
      operatingHoursDay: 5,
      overrideTotalDynamicHeadM: 50,
    });

    expect(exactResult.flowRateM3Sec).toBeCloseTo(0.01, 5);
    expect(exactResult.combinedEfficiencyPct).toBeCloseTo(60, 1);
    expect(exactResult.hydraulicPowerKw).toBeCloseTo(4.903, 3);
    expect(exactResult.electricalPowerKw).toBeCloseTo(8.172, 2);
    expect(exactResult.dailyEnergyKwh).toBeCloseTo(40.86, 1);
    expect(exactResult.monthlyEnergyKwh).toBeCloseTo(1225.8, 0);
    expect(exactResult.dailyVolumeM3).toBeCloseTo(180, 1);
    expect(result.hydraulicPowerKw).toBeCloseTo(4.903, 3);
  });

  it("includes Hazen-Williams pipe friction and 15% fittings in Total Dynamic Head", () => {
    const hf = calculateHazenWilliamsFrictionLossM(25, 300, 75, 140);
    expect(hf).toBeGreaterThan(2);
    expect(hf).toBeLessThan(20);

    const pump = calculatePumpEnergy({
      flowRateM3Hr: 25,
      staticElevationDiffM: 12,
      pipeLengthM: 300,
      pipeDiameterMm: 75,
      operatingPressureHeadM: 15,
      pumpEfficiencyPct: 65,
      motorEfficiencyPct: 88,
      operatingHoursDay: 6,
    });

    expect(pump.totalDynamicHeadM).toBeCloseTo(
      12 + pump.frictionLossM + pump.fittingsLossM + 15,
      2
    );
    expect(pump.engineeringNotes.some((n) => n.includes("straight-line distance"))).toBe(true);
  });

  it("handles negative elevation difference (gravity-assisted source uphill of farm)", () => {
    const pump = calculatePumpEnergy({
      flowRateM3Hr: 20,
      staticElevationDiffM: -10,
      pipeLengthM: 150,
      pipeDiameterMm: 90,
      operatingPressureHeadM: 15,
      pumpEfficiencyPct: 65,
      motorEfficiencyPct: 88,
      operatingHoursDay: 4,
    });

    expect(pump.staticHeadM).toBe(0);
    expect(pump.engineeringNotes[0]).toContain("Gravity-fed delivery");
  });
});
