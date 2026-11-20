import { describe, expect, it } from "vitest";
import { calculatePumpEnergy } from "@/lib/engines/pump-calculator";
import { compareSolarAndPumpEnergy } from "@/lib/engines/solar-irrigation-matcher";
import type { MonthlySolarProduction } from "@/types/agri";

const SAMPLE_SOLAR: MonthlySolarProduction[] = [
  { monthIndex: 1, monthName: "Jan", dailyAvgKwh: 28, monthlyKwh: 868, inPlaneIrradiationDailyKwhM2: 3.5, inPlaneIrradiationMonthlyKwhM2: 108, interAnnualSdKwh: 50 },
  { monthIndex: 2, monthName: "Feb", dailyAvgKwh: 34, monthlyKwh: 952, inPlaneIrradiationDailyKwhM2: 4.3, inPlaneIrradiationMonthlyKwhM2: 120, interAnnualSdKwh: 55 },
  { monthIndex: 3, monthName: "Mar", dailyAvgKwh: 43, monthlyKwh: 1333, inPlaneIrradiationDailyKwhM2: 5.5, inPlaneIrradiationMonthlyKwhM2: 170, interAnnualSdKwh: 65 },
  { monthIndex: 4, monthName: "Apr", dailyAvgKwh: 48, monthlyKwh: 1440, inPlaneIrradiationDailyKwhM2: 6.1, inPlaneIrradiationMonthlyKwhM2: 183, interAnnualSdKwh: 70 },
  { monthIndex: 5, monthName: "May", dailyAvgKwh: 52, monthlyKwh: 1612, inPlaneIrradiationDailyKwhM2: 6.6, inPlaneIrradiationMonthlyKwhM2: 204, interAnnualSdKwh: 60 },
  { monthIndex: 6, monthName: "Jun", dailyAvgKwh: 54, monthlyKwh: 1620, inPlaneIrradiationDailyKwhM2: 6.9, inPlaneIrradiationMonthlyKwhM2: 207, interAnnualSdKwh: 50 },
  { monthIndex: 7, monthName: "Jul", dailyAvgKwh: 56, monthlyKwh: 1736, inPlaneIrradiationDailyKwhM2: 7.2, inPlaneIrradiationMonthlyKwhM2: 223, interAnnualSdKwh: 45 },
  { monthIndex: 8, monthName: "Aug", dailyAvgKwh: 52, monthlyKwh: 1612, inPlaneIrradiationDailyKwhM2: 6.7, inPlaneIrradiationMonthlyKwhM2: 207, interAnnualSdKwh: 45 },
  { monthIndex: 9, monthName: "Sep", dailyAvgKwh: 45, monthlyKwh: 1350, inPlaneIrradiationDailyKwhM2: 5.8, inPlaneIrradiationMonthlyKwhM2: 174, interAnnualSdKwh: 55 },
  { monthIndex: 10, monthName: "Oct", dailyAvgKwh: 38, monthlyKwh: 1178, inPlaneIrradiationDailyKwhM2: 4.9, inPlaneIrradiationMonthlyKwhM2: 152, interAnnualSdKwh: 60 },
  { monthIndex: 11, monthName: "Nov", dailyAvgKwh: 30, monthlyKwh: 900, inPlaneIrradiationDailyKwhM2: 3.8, inPlaneIrradiationMonthlyKwhM2: 114, interAnnualSdKwh: 55 },
  { monthIndex: 12, monthName: "Dec", dailyAvgKwh: 26, monthlyKwh: 806, inPlaneIrradiationDailyKwhM2: 3.3, inPlaneIrradiationMonthlyKwhM2: 102, interAnnualSdKwh: 50 },
];

describe("Solar vs Irrigation Pump Energy Matcher", () => {
  it("computes monthly balance, worst-month deficit, and storage recommendations", () => {
    const pump = calculatePumpEnergy({
      flowRateM3Hr: 25,
      staticElevationDiffM: 25,
      pipeLengthM: 200,
      pipeDiameterMm: 75,
      operatingPressureHeadM: 15,
      pumpEfficiencyPct: 65,
      motorEfficiencyPct: 88,
      operatingHoursDay: 8,
    });

    const comparison = compareSolarAndPumpEnergy({
      solarMonthly: SAMPLE_SOLAR,
      pumpResult: pump,
    });

    expect(comparison.monthly).toHaveLength(12);
    expect(comparison.annualSolarKwh).toBe(15407);
    expect(comparison.annualPumpKwh).toBeGreaterThan(10000);
    expect(comparison.worstMonthCoveragePct).toBeLessThanOrEqual(comparison.annualCoveragePct);
    expect(comparison.recommendedWaterStorageTankM3).toBeGreaterThan(0);
    expect(comparison.recommendedBatteryKwh).toBeGreaterThan(0);
    expect(comparison.engineeringWarnings[0]).toContain("Annual energy balance");
  });
});
