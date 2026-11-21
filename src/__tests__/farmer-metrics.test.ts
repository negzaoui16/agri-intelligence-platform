import { describe, expect, it, afterEach } from "vitest";
import { getSessionState } from "@/lib/auth/session";
import { SOIL_TEXTURE_DEFAULTS } from "@/lib/db/defaults";
import { localizeMonthName, MAGHREB_ARABIC_MONTHS } from "@/lib/i18n/translations";
import { buildFeasibilityReport } from "@/lib/services/analysis-orchestrator";
import { selectFarmerMetrics } from "@/lib/services/farmer-metrics";
import type { CompleteFarmAnalysisBundle, FarmRecord } from "@/types/agri";

function makeDemoFarm(overrides: Partial<FarmRecord["pumpConfig"]> = {}): FarmRecord {
  const now = new Date().toISOString();
  return {
    id: "farm_mitidja_01",
    userId: "user_demo_agronomist",
    name: "Mitidja Plain Citrus & Market Estate",
    country: "Algeria",
    region: "Blida / Mitidja Plain",
    centerLat: 36.605,
    centerLon: 2.945,
    elevationM: 76,
    areaHectares: 12.4,
    perimeterMeters: 1440,
    boundary: null,
    pins: [],
    soilProfile: {
      ...SOIL_TEXTURE_DEFAULTS.CLAY_LOAM,
      source: "Test",
      updatedAt: now,
    },
    solarConfig: {
      capacityKwp: 12,
      tiltDeg: 32,
      azimuthDeg: 0,
      mountingType: "free",
      systemLossPct: 14,
      optimizeAngles: false,
      updatedAt: now,
    },
    pumpConfig: {
      flowRateM3Hr: 28,
      staticHeadM: 18,
      pipeLengthM: 220,
      pipeDiameterMm: 90,
      pipeMaterialC: 140,
      frictionLossM: 4.1,
      operatingPressureHeadM: 15,
      totalDynamicHeadM: 37.1,
      pumpEfficiencyPct: 68,
      motorEfficiencyPct: 88,
      operatingHoursDay: 7,
      updatedAt: now,
      ...overrides,
    },
    irrigationConfig: {
      cropCode: "citrus",
      irrigatedAreaHa: 12.4,
      irrigationMethod: "DRIP",
      applicationEfficiencyPct: 90,
      plantingMonth: 3,
    },
    createdAt: now,
    updatedAt: now,
  };
}

function makeMockBundle(): CompleteFarmAnalysisBundle {
  const now = new Date().toISOString();
  const cite = {
    id: "cite_test",
    name: "Test Source",
    provider: "Test",
    provenance: "MODELED" as const,
    retrievedAt: now,
  };

  return {
    farmId: "farm_mitidja_01",
    generatedAt: now,
    coordinates: { latitude: 36.605, longitude: 2.945 },
    weather: {
      latitude: 36.605,
      longitude: 2.945,
      timezone: "Africa/Algiers",
      elevationM: 35,
      current: {
        temperatureC: 14.4,
        relativeHumidityPct: 68,
        precipitationMm: 0,
        windSpeedKmh: 9,
        windDirectionDeg: 180,
        weatherCode: 2,
        weatherSummary: "Partly cloudy",
        observedAt: now,
      },
      daily: [
        {
          date: "2026-11-21",
          tempMaxC: 22,
          tempMinC: 14,
          precipMm: 0,
          precipProbPct: 10,
          windSpeedMaxKmh: 12,
          windDirectionDeg: 180,
          shortwaveRadiationMjM2: 14,
          et0Mm: 2.1,
        },
      ],
      alerts: [],
      thresholds: {
        frostMinTempC: 2,
        heatMaxTempC: 35,
        highWindKmh: 35,
        heavyRainMm: 25,
        highEt0Mm: 6.5,
      },
      citation: cite,
    },
    climate: {
      latitude: 36.605,
      longitude: 2.945,
      periodStart: "2025-11-21",
      periodEnd: "2026-11-20",
      annualPrecipMm: 891,
      annualEt0Mm: 1304,
      annualMeanTempC: 18.5,
      annualGddBase10: 3100,
      aridityIndex: 0.683,
      aridityClass: "Humid",
      monthly: [],
      seasons: [
        {
          season: "Summer",
          months: "Jun-Aug",
          precipSumMm: 15,
          et0SumMm: 520,
          tempMeanAvgC: 27,
          moistureDeficitMm: 505,
        },
      ],
      citation: cite,
    },
    elevation: {
      farmLatitude: 36.605,
      farmLongitude: 2.945,
      farmElevationM: 35,
      fieldMinElevationM: 34,
      fieldMaxElevationM: 37,
      fieldReliefM: 3,
      estimatedSlopePct: 0.4,
      slopeAspect: "South",
      samplePoints: [],
      citation: cite,
    },
    waterSources: {
      latitude: 36.605,
      longitude: 2.945,
      searchRadiusM: 10000,
      nearestSource: {
        id: "ws_1",
        externalId: "osm_1",
        name: "Water point",
        sourceType: "WATER_INFRASTRUCTURE",
        provider: "OSM_OVERPASS",
        latitude: 36.601,
        longitude: 2.948,
        distanceFromCentroidM: 527,
        distanceFromBoundaryM: 527,
        bearingDegrees: 140,
        cardinalDirection: "south-east",
        spatialRelationship: "NEARBY_<1KM",
        elevationM: 34,
        elevationDiffFromFarmM: -1,
        confidence: "HIGH",
        operationalVerified: false,
        disclaimer: "Unverified on map.",
        retrievedAt: now,
      },
      sources: [
        {
          id: "ws_1",
          externalId: "osm_1",
          name: "Water point",
          sourceType: "WATER_INFRASTRUCTURE",
          provider: "OSM_OVERPASS",
          latitude: 36.601,
          longitude: 2.948,
          distanceFromCentroidM: 527,
          distanceFromBoundaryM: 527,
          bearingDegrees: 140,
          cardinalDirection: "south-east",
          spatialRelationship: "NEARBY_<1KM",
          elevationM: 34,
          elevationDiffFromFarmM: -1,
          confidence: "HIGH",
          operationalVerified: false,
          disclaimer: "Unverified on map.",
          retrievedAt: now,
        },
      ],
      hydroBasin: null,
      citations: [cite],
      mandatoryWarning: "Verify on site.",
      retrievedAt: now,
    },
    wapor: {
      latitude: 36.605,
      longitude: 2.945,
      actualEvapotranspirationMmYr: 620,
      referenceEvapotranspirationMmYr: 1300,
      precipitationMmYr: 891,
      relativeEvapotranspiration: 0.48,
      totalBiomassProductionKgHa: 9500,
      netBiomassWaterProductivityKgM3: 1.5,
      l2HighResAetiMmYr: null,
      l2CoverageAvailable: false,
      layers: [],
      citation: cite,
      limitations: "300m pixel",
    },
    solar: {
      latitude: 36.605,
      longitude: 2.945,
      capacityKwp: 12,
      tiltDeg: 32,
      azimuthDeg: 0,
      mountingType: "free",
      systemLossPct: 14,
      dailyAvgKwh: 51.5,
      monthlyAvgKwh: 1568,
      annualKwh: 18816,
      specificYieldKwhPerKwp: 1568,
      optimalTiltDeg: 32,
      optimalAzimuthDeg: 0,
      lossesBreakdown: {
        angleOfIncidencePct: 2.6,
        spectralPct: 1,
        temperatureAndIrradiancePct: 7.4,
        totalLossPct: 14,
      },
      monthly: [],
      seasonal: [],
      isEstimatedFallback: false,
      citation: cite,
    },
    pump: {
      flowRateM3Hr: 28,
      flowRateM3Sec: 0.00778,
      staticHeadM: 18,
      frictionLossM: 4.1,
      fittingsLossM: 0.3,
      operatingPressureHeadM: 15,
      totalDynamicHeadM: 37.4,
      combinedEfficiencyPct: 59.8,
      hydraulicPowerKw: 2.85,
      electricalPowerKw: 4.77,
      dailyVolumeM3: 196,
      dailyEnergyKwh: 33.4,
      monthlyEnergyKwh: 1002,
      annualEnergyKwh: 10930,
      specificEnergyKwhPerM3: 0.17,
      recommendedPvArrayKwp: 6.5,
      engineeringNotes: [],
    },
    irrigation: {
      crop: {
        code: "citrus",
        name: "Citrus",
        scientificName: "Citrus sinensis",
        category: "Fruit Trees",
        kcIni: 0.7,
        kcMid: 0.65,
        kcEnd: 0.7,
        stageIniDays: 60,
        stageDevDays: 90,
        stageMidDays: 120,
        stageLateDays: 95,
        rootDepthMinM: 1.0,
        rootDepthMaxM: 1.4,
        depletionFractionP: 0.5,
        yieldResponseKy: 1.1,
        optimalTempMinC: 15,
        optimalTempMaxC: 32,
        droughtTolerance: "Moderate",
        salinityToleranceDsm: 1.7,
      },
      irrigatedAreaHa: 12.4,
      irrigationMethod: "DRIP",
      applicationEfficiencyPct: 90,
      plantingMonth: 3,
      annualEt0Mm: 1304,
      annualEtcMm: 860,
      annualEffectiveRainMm: 380,
      annualNetIrrigationMm: 526,
      annualGrossIrrigationMm: 584,
      annualGrossVolumeM3: 72462,
      peakMonthName: "July",
      peakDailyWaterM3: 621,
      totalAvailableWaterMm: 165,
      readilyAvailableWaterMm: 82.5,
      peakIrrigationIntervalDays: 6,
      monthly: [],
      missingDataWarnings: [],
      methodology: "FAO-56",
    },
    solarVsPump: {
      annualSolarKwh: 18816,
      annualPumpKwh: 10930,
      annualNetBalanceKwh: 7886,
      annualCoveragePct: 100,
      worstMonthName: "July",
      worstMonthCoveragePct: 59,
      worstMonthDeficitKwh: 1329,
      directDriveFeasible: true,
      recommendedBatteryKwh: 158,
      recommendedWaterStorageTankM3: 931,
      estimatedGridDependencyPct: 18,
      monthly: [],
      engineeringWarnings: [],
    },
    cropSuitability: [
      {
        cropCode: "olive",
        cropName: "Olive Trees",
        category: "Tree Crop",
        score: 92,
        rating: "HIGH",
        estimatedAnnualIrrigationM3Ha: 3200,
        thermalMatchNote: "Ideal Mediterranean climate",
        waterDemandNote: "needs the least water",
      },
      {
        cropCode: "citrus",
        cropName: "Citrus",
        category: "Fruit Trees",
        score: 82,
        rating: "HIGH",
        estimatedAnnualIrrigationM3Ha: 5840,
        thermalMatchNote: "Good temperature range",
        waterDemandNote: "thirsty in July",
      },
    ],
  };
}

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
});
