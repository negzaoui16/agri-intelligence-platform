import { describe, expect, it } from "vitest";
import {
  allocateWaterKKT,
  compareSimulationScenarios,
  computeFarmBrainAnalysis,
  detectSensorAnomaly,
  evaluateDataCompleteness,
  predictOptimalDailyWaterDemandMm,
  runFarmBrainSimulation,
  simulateCropGrowthTs,
} from "@/lib/engines/farmbrain-engine";
import { SOIL_TEXTURE_DEFAULTS } from "@/lib/db/defaults";
import type { FarmRecord, FarmSensorsBundle, SimulationScenarioRecord } from "@/types/agri";

function makeSampleFarm(overrides?: Partial<FarmRecord>): FarmRecord {
  const now = "2026-06-01T10:00:00.000Z";
  return {
    id: "farm_test_01",
    userId: "user_test_01",
    name: "Nabeul Olive & Tomato Farm",
    country: "Tunisia",
    region: "Cap Bon",
    centerLat: 36.45,
    centerLon: 10.73,
    elevationM: 42,
    areaHectares: 4.0,
    perimeterMeters: 800,
    boundary: {
      type: "Polygon",
      coordinates: [
        [
          [10.72, 36.46],
          [10.74, 36.46],
          [10.74, 36.44],
          [10.72, 36.44],
          [10.72, 36.46],
        ],
      ],
    },
    boundaryVerified: true,
    pins: [],
    crops: [
      {
        id: "plot_tomato",
        farmId: "farm_test_01",
        cropCode: "tomato",
        cropName: "Tomato",
        cultivatedAreaHa: 1.5,
        areaUnit: "ha",
        plantingDate: "2026-03-10",
        growthStage: "FLOWERING",
        plotCount: 1,
        irrigationMethod: "DRIP",
      },
      {
        id: "plot_olive",
        farmId: "farm_test_01",
        cropCode: "olive",
        cropName: "Olive",
        cultivatedAreaHa: 2.5,
        areaUnit: "ha",
        plantingDate: "2020-02-01",
        growthStage: "MID",
        plotCount: 1,
        irrigationMethod: "DRIP",
      },
    ],
    farmerWaterSources: [
      {
        id: "ws_1",
        farmId: "farm_test_01",
        sourceType: "WELL",
        isFarmerProvided: true,
      },
    ],
    soilProfile: {
      ...SOIL_TEXTURE_DEFAULTS.LOAM,
      source: "FARMER_PROVIDED",
      updatedAt: now,
    },
    solarConfig: {
      solarStatus: "YES",
      capacityKwp: 10,
      tiltDeg: 31,
      azimuthDeg: 0,
      mountingType: "free",
      systemLossPct: 14,
      optimizeAngles: false,
      hasGridConnection: false,
      isFarmerProvided: true,
      updatedAt: now,
    },
    pumpConfig: {
      hasPump: true,
      flowRateM3Hr: 18,
      staticHeadM: 20,
      pipeLengthM: 120,
      pipeDiameterMm: 75,
      pipeMaterialC: 140,
      frictionLossM: 3,
      operatingPressureHeadM: 15,
      totalDynamicHeadM: 38,
      pumpEfficiencyPct: 68,
      motorEfficiencyPct: 88,
      operatingHoursDay: 6,
      isFarmerProvided: true,
      updatedAt: now,
    },
    irrigationConfig: {
      cropCode: "tomato",
      irrigatedAreaHa: 4,
      irrigationMethod: "DRIP",
      applicationEfficiencyPct: 90,
      plantingMonth: 3,
    },
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe("FarmBrain Engine & Simulator", () => {
  it("runs trained ML artifact predictions and flags soil sensor faults cleanly", () => {
    const dryDemand = predictOptimalDailyWaterDemandMm({
      soilMoisturePct: 24,
      tempMaxC: 35,
      humidityPct: 35,
      rainMm: 0,
      et0Mm: 6.4,
      kc: 1.15,
      tawMmM: 170,
      dayOfYear: 180,
    });
    const wetDemand = predictOptimalDailyWaterDemandMm({
      soilMoisturePct: 84,
      tempMaxC: 21,
      humidityPct: 80,
      rainMm: 14,
      et0Mm: 2.1,
      kc: 0.7,
      tawMmM: 170,
      dayOfYear: 40,
    });
    expect(dryDemand.recommendedIrrigationMm).toBeGreaterThan(wetDemand.recommendedIrrigationMm);
    expect(dryDemand.r2).toBeGreaterThan(0.9);

    const fault = detectSensorAnomaly({
      id: "sr_fault",
      deviceId: "dev_1",
      farmId: "farm_test_01",
      recordedAt: new Date().toISOString(),
      receivedAt: new Date().toISOString(),
      airTempC: 28,
      airHumidityPct: 50,
      soilMoisturePct: null,
      soilRaw: 4095,
      waterLevelPct: 60,
      waterRaw: 1800,
      pumpOn: false,
      soilFault: true,
    });
    expect(fault.anomalyDetected).toBe(true);
    expect(fault.reason).toContain("fault");
  });

  it("enforces solar-free electricity cost & savings when solar covers the pump", () => {
    const farm = makeSampleFarm();
    const brain = computeFarmBrainAnalysis({
      farm,
      waterTariffTndPerM3: 0.3,
      electricityTariffTndPerKwh: 0.25,
    });

    expect(brain.savings.waterSavedM3Yr).toBeGreaterThan(0);
    expect(brain.savings.waterSavedLitresYr).toBe(brain.savings.waterSavedM3Yr * 1000);
    expect(brain.savings.energySavedKwhYr).toBeGreaterThan(0);
    expect(brain.savings.timeSavedHoursYr).toBeGreaterThan(0);
    expect(brain.savings.solarCoversPumpElectricity).toBe(true);
    // Strict rule: grid electricity TND cost and electricity TND saved must remain 0 under full solar
    expect(brain.savings.baselineEnergyCostTndYr).toBe(0);
    expect(brain.savings.smartEnergyCostTndYr).toBe(0);
    expect(brain.savings.energyCostSavedTndYr).toBe(0);
    expect(brain.savings.waterCostSavedTndYr).toBeGreaterThan(0);
  });

  it("transitions across 3-tier verification states as ESP32 telemetry accumulates", () => {
    const farm = makeSampleFarm();
    const t0 = Date.now() - 3 * 3600_000;
    const t1 = Date.now() - 2 * 3600_000;
    const t2 = Date.now() - 5 * 60_000;

    // Tier 1: No sensor
    const tier1 = computeFarmBrainAnalysis({ farm, sensors: null });
    expect(tier1.verifiedTracking.tier).toBe("INITIAL_PROJECTION");

    // Tier 2: Single fresh sensor reading
    const singleSensor: FarmSensorsBundle = {
      farmId: farm.id,
      devices: [],
      latestReading: {
        id: "r1",
        deviceId: "d1",
        farmId: farm.id,
        recordedAt: new Date(t2).toISOString(),
        receivedAt: new Date(t2).toISOString(),
        airTempC: 27,
        airHumidityPct: 55,
        soilMoisturePct: 68,
        soilRaw: 1650,
        waterLevelPct: 80,
        waterRaw: 2200,
        pumpOn: false,
        soilFault: false,
      },
      readings24h: [],
    };
    const tier2 = computeFarmBrainAnalysis({ farm, sensors: singleSensor });
    expect(tier2.verifiedTracking.tier).toBe("SENSOR_UPDATED_PROJECTION");

    // Tier 3: Multi-point 24h telemetry with actual pumpOn cycle
    const multiSensors: FarmSensorsBundle = {
      ...singleSensor,
      readings24h: [
        { ...singleSensor.latestReading!, id: "ra", recordedAt: new Date(t0).toISOString(), pumpOn: true },
        { ...singleSensor.latestReading!, id: "rb", recordedAt: new Date(t1).toISOString(), pumpOn: false },
        { ...singleSensor.latestReading!, id: "rc", recordedAt: new Date(t2).toISOString(), pumpOn: false },
      ],
    };
    const tier3 = computeFarmBrainAnalysis({ farm, sensors: multiSensors });
    expect(tier3.verifiedTracking.tier).toBe("VERIFIED_ACTUAL");
    expect(tier3.verifiedTracking.observedPumpCycles24h).toBe(1);
    expect(tier3.verifiedTracking.observedPumpHours24h).toBeGreaterThan(0.5);
  });

  it("uses FAO Paper 66 AquaCrop for annuals and FAO-33 for perennials", () => {
    const et0 = Array(150).fill(4.6);
    const rain = Array(150).fill(0.4);
    const irr = Array(150).fill(4.2);

    const tomatoSim = simulateCropGrowthTs({
      cropCode: "tomato",
      dailyEt0Mm: et0,
      dailyRainMm: rain,
      dailyIrrigationMm: irr,
    });
    expect(tomatoSim.modelUsed).toBe("FAO_AQUACROP_P66");
    expect(tomatoSim.estimatedYieldTonHa).toBeGreaterThan(10);

    const oliveSim = simulateCropGrowthTs({
      cropCode: "olive",
      dailyEt0Mm: et0,
      dailyRainMm: rain,
      dailyIrrigationMm: irr,
    });
    expect(oliveSim.modelUsed).toBe("FAO33_WATER_PRODUCTION");
    expect(oliveSim.estimatedYieldTonHa).toBeGreaterThan(0);
  });

  it("allocates scarce water via KKT optimization prioritizing sensitive crops (not equal split)", () => {
    const allocs = allocateWaterKKT(3000, [
      {
        plotId: "p_sensitive",
        cropCode: "tomato",
        cropName: "Tomato",
        areaHa: 1.0,
        growthStage: "FLOWERING",
        dailyNeedLitres: 3000,
        priorityWeight: 2.2,
        ky: 1.05,
      },
      {
        plotId: "p_hardy",
        cropCode: "olive",
        cropName: "Olive",
        areaHa: 1.0,
        growthStage: "LATE",
        dailyNeedLitres: 3000,
        priorityWeight: 0.65,
        ky: 0.7,
      },
    ]);

    const totalAlloc = allocs.reduce((s, a) => s + a.allocatedLitresDay, 0);
    expect(totalAlloc).toBeLessThanOrEqual(3000);
    expect(allocs[0].fulfillmentPct).toBeGreaterThan(allocs[1].fulfillmentPct);
  });

  it("runs all 5 isolated simulator scenarios and compares them side by side", () => {
    const farm = makeSampleFarm();
    const completeness = evaluateDataCompleteness({ farm });
    expect(completeness.pct).toBeGreaterThan(75);

    const scenarios: SimulationScenarioRecord[] = (
      [
        { name: "Shortage 2000L", inputs: { scenarioType: "WATER_SHORTAGE", availableWaterLitres: 2000 } },
        { name: "Switch to Olive", inputs: { scenarioType: "CHANGE_CROP", targetPlotId: "plot_tomato", newCropCode: "olive" } },
        { name: "Heatwave +4C", inputs: { scenarioType: "WEATHER_CLIMATE", tempDeltaC: 4, rainChangePct: -50 } },
        { name: "AI Schedule", inputs: { scenarioType: "IRRIGATION_STRATEGY", strategy: "AI_OPTIMIZED" } },
        { name: "Expand +40 ha", inputs: { scenarioType: "FARM_EXPANSION", addedAreaHa: 40, addedCropCode: "tomato" } },
      ] as const
    ).map((cfg, i) => ({
      id: `sim_${i}`,
      farmId: farm.id,
      userId: farm.userId,
      name: cfg.name,
      scenarioType: cfg.inputs.scenarioType,
      inputs: { ...cfg.inputs },
      result: runFarmBrainSimulation({ farm, inputs: { ...cfg.inputs } }),
      isArchived: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastRunAt: new Date().toISOString(),
    }));

    // Verify large expansion triggers pump overload safety alert
    const expRes = scenarios[4].result!;
    expect(expRes.pumpOverloadRisk).toBe(true);
    expect(expRes.waterDeltaM3Season).toBeGreaterThan(0);

    // Compare scenarios
    const cmp = compareSimulationScenarios(farm.id, scenarios);
    expect(cmp.scenarios.length).toBe(5);
    expect(cmp.bestForWaterSavingId).toBeTruthy();
    expect(cmp.bestOverallId).toBeTruthy();
  });
});
