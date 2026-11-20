import { describe, expect, it } from "vitest";
import {
  calculateCropWaterRequirements,
  calculateEffectiveRainfallMm,
  calculatePenmanMonteithET0,
  rankCropSuitability,
} from "@/lib/engines/fao56-calculator";
import type { MonthlyClimateSummary } from "@/types/agri";

const SAMPLE_CLIMATE: MonthlyClimateSummary[] = [
  { monthIndex: 1, monthName: "Jan", tempMinAvgC: 6, tempMaxAvgC: 16, tempMeanAvgC: 11, precipSumMm: 85, et0SumMm: 52, radiationAvgMjM2Day: 9.5, rainyDays: 9, waterBalanceMm: 33, growingDegreeDays: 31 },
  { monthIndex: 2, monthName: "Feb", tempMinAvgC: 7, tempMaxAvgC: 17, tempMeanAvgC: 12, precipSumMm: 70, et0SumMm: 64, radiationAvgMjM2Day: 12.1, rainyDays: 8, waterBalanceMm: 6, growingDegreeDays: 56 },
  { monthIndex: 3, monthName: "Mar", tempMinAvgC: 9, tempMaxAvgC: 20, tempMeanAvgC: 14.5, precipSumMm: 55, et0SumMm: 96, radiationAvgMjM2Day: 16.5, rainyDays: 6, waterBalanceMm: -41, growingDegreeDays: 140 },
  { monthIndex: 4, monthName: "Apr", tempMinAvgC: 11, tempMaxAvgC: 23, tempMeanAvgC: 17, precipSumMm: 40, et0SumMm: 122, radiationAvgMjM2Day: 20.2, rainyDays: 5, waterBalanceMm: -82, growingDegreeDays: 210 },
  { monthIndex: 5, monthName: "May", tempMinAvgC: 14, tempMaxAvgC: 27, tempMeanAvgC: 20.5, precipSumMm: 22, et0SumMm: 155, radiationAvgMjM2Day: 24.0, rainyDays: 3, waterBalanceMm: -133, growingDegreeDays: 325 },
  { monthIndex: 6, monthName: "Jun", tempMinAvgC: 18, tempMaxAvgC: 31, tempMeanAvgC: 24.5, precipSumMm: 6, et0SumMm: 182, radiationAvgMjM2Day: 26.8, rainyDays: 1, waterBalanceMm: -176, growingDegreeDays: 435 },
  { monthIndex: 7, monthName: "Jul", tempMinAvgC: 21, tempMaxAvgC: 34, tempMeanAvgC: 27.5, precipSumMm: 2, et0SumMm: 204, radiationAvgMjM2Day: 27.5, rainyDays: 0, waterBalanceMm: -202, growingDegreeDays: 542 },
  { monthIndex: 8, monthName: "Aug", tempMinAvgC: 21, tempMaxAvgC: 34, tempMeanAvgC: 27.5, precipSumMm: 5, et0SumMm: 186, radiationAvgMjM2Day: 24.8, rainyDays: 1, waterBalanceMm: -181, growingDegreeDays: 542 },
  { monthIndex: 9, monthName: "Sep", tempMinAvgC: 18, tempMaxAvgC: 30, tempMeanAvgC: 24, precipSumMm: 30, et0SumMm: 132, radiationAvgMjM2Day: 19.6, rainyDays: 3, waterBalanceMm: -102, growingDegreeDays: 420 },
  { monthIndex: 10, monthName: "Oct", tempMinAvgC: 14, tempMaxAvgC: 25, tempMeanAvgC: 19.5, precipSumMm: 60, et0SumMm: 95, radiationAvgMjM2Day: 14.5, rainyDays: 6, waterBalanceMm: -35, growingDegreeDays: 294 },
  { monthIndex: 11, monthName: "Nov", tempMinAvgC: 10, tempMaxAvgC: 20, tempMeanAvgC: 15, precipSumMm: 82, et0SumMm: 62, radiationAvgMjM2Day: 10.4, rainyDays: 8, waterBalanceMm: 20, growingDegreeDays: 150 },
  { monthIndex: 12, monthName: "Dec", tempMinAvgC: 7, tempMaxAvgC: 17, tempMeanAvgC: 12, precipSumMm: 90, et0SumMm: 48, radiationAvgMjM2Day: 8.6, rainyDays: 9, waterBalanceMm: 42, growingDegreeDays: 62 },
];

describe("FAO-56 Penman-Monteith & Crop Water Requirement Engine", () => {
  it("computes physically realistic FAO-56 Penman-Monteith daily ET0", () => {
    const summerEt0 = calculatePenmanMonteithET0({
      tempMinC: 19,
      tempMaxC: 33,
      relativeHumidityPct: 45,
      windSpeed10mKmh: 12,
      solarRadiationMjM2Day: 26,
      latitudeDeg: 36.7,
      elevationM: 80,
      dayOfYear: 196,
    });
    const winterEt0 = calculatePenmanMonteithET0({
      tempMinC: 6,
      tempMaxC: 15,
      relativeHumidityPct: 78,
      windSpeed10mKmh: 8,
      solarRadiationMjM2Day: 9,
      latitudeDeg: 36.7,
      elevationM: 80,
      dayOfYear: 15,
    });

    expect(summerEt0).toBeGreaterThan(5.0);
    expect(summerEt0).toBeLessThan(9.5);
    expect(winterEt0).toBeGreaterThan(0.8);
    expect(winterEt0).toBeLessThan(2.5);
  });

  it("computes USDA-SCS effective rainfall accurately", () => {
    expect(calculateEffectiveRainfallMm(0)).toBe(0);
    expect(calculateEffectiveRainfallMm(50)).toBeCloseTo(46, 1);
    expect(calculateEffectiveRainfallMm(300)).toBeCloseTo(155, 1);
  });

  it("calculates monthly ETc, gross irrigation volume, and soil water balance for tomato", () => {
    const req = calculateCropWaterRequirements({
      cropCode: "tomato",
      irrigatedAreaHa: 10,
      irrigationMethod: "DRIP",
      plantingMonth: 3,
      monthlyClimate: SAMPLE_CLIMATE,
      pumpFlowRateM3Hr: 25,
    });

    expect(req.monthly).toHaveLength(12);
    expect(req.annualEtcMm).toBeGreaterThan(600);
    expect(req.annualGrossVolumeM3).toBeGreaterThan(40000);
    expect(req.peakDailyWaterM3).toBeGreaterThan(300);
    expect(req.totalAvailableWaterMm).toBeGreaterThan(req.readilyAvailableWaterMm);
    expect(req.missingDataWarnings.length).toBeGreaterThan(0);
  });

  it("ranks drought-tolerant Mediterranean crops realistically", () => {
    const ranked = rankCropSuitability(SAMPLE_CLIMATE, 3);
    expect(ranked.length).toBeGreaterThanOrEqual(10);
    expect(ranked[0].score).toBeGreaterThanOrEqual(ranked[ranked.length - 1].score);
    const olive = ranked.find((c) => c.cropCode === "olive");
    expect(olive?.score).toBeGreaterThan(70);
  });
});
