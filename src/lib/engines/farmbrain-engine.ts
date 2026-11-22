/**
 * FarmBrain Scientific Engine (TypeScript Core)
 *
 * Unifies:
 *  - Deterministic trained scikit-learn tree inference (loaded from ml-model-artifacts.json)
 *    with optional live Python FastAPI bridge (ml_service/app.py)
 *  - FAO-56 evapotranspiration, Penman-Monteith ET0 & soil-water balance (reusing fao56-calculator.ts)
 *  - FAO Paper 66 AquaCrop daily canopy/biomass/yield simulation for supported annual crops
 *    and FAO-33 Yield-Water Production function (Ky) for perennial orchards
 *  - Hydraulic pump energy (pump-calculator.ts) & PVGIS solar matching (solar-irrigation-matcher.ts)
 *    with strict solar-free electricity cost accounting
 *  - Constrained nonlinear KKT water allocation optimization across plots
 *  - 5-scenario isolated Agricultural Decision Simulator & comparator
 */

import type {
  CompleteFarmAnalysisBundle,
  FarmBrainAnalysisRecord,
  FarmBrainCompletenessItem,
  FarmBrainDailyMoistureForecastPoint,
  FarmBrainExplainableAdvice,
  FarmBrainPlotBreakdown,
  FarmBrainSavingsBreakdown,
  FarmBrainVerifiedSavingsTracking,
  FarmCropRecord,
  FarmRecord,
  FarmSensorsBundle,
  IrrigationMethod,
  MonthlyClimateSummary,
  SensorReadingRecord,
  SimulationComparisonResult,
  SimulationDailyTrajectoryPoint,
  SimulationPlotAllocation,
  SimulationScenarioInputs,
  SimulationScenarioRecord,
  SimulationScenarioResult,
} from "@/types/agri";
import { IRRIGATION_EFFICIENCY_DEFAULTS } from "../db/defaults";
import {
  calculateCropWaterRequirements,
  calculatePenmanMonteithET0,
  getCropSpec,
  rankCropSuitability,
} from "./fao56-calculator";
import mlArtifactsRaw from "./ml-model-artifacts.json";
import { calculatePumpEnergy } from "./pump-calculator";

interface SerializedDecisionTree {
  childrenLeft: number[];
  childrenRight: number[];
  feature: number[];
  threshold: number[];
  value: number[];
}

interface MlArtifactsBundle {
  metadata: {
    version: string;
    trainedAt: string;
    splitStrategy: string;
    splitDate: string;
    trainSamples: number;
    testSamples: number;
    models: {
      soil_moisture_forecaster: {
        algorithm: string;
        metrics: { mae: number; rmse: number; r2: number };
        residualP80Pct: number;
      };
      irrigation_water_demand: {
        algorithm: string;
        metrics: { mae: number; rmse: number; r2: number };
      };
      sensor_anomaly_detector: {
        algorithm: string;
        metrics: { precision: number; recall: number; f1: number; mae: number; rmse: number; r2: number };
      };
    };
  };
  soilMoistureForecaster: {
    features: string[];
    residualP80Pct: number;
    trees: SerializedDecisionTree[];
  };
  irrigationWaterDemand: {
    features: string[];
    initPrediction: number;
    learningRate: number;
    trees: SerializedDecisionTree[];
  };
  sensorAnomalyDetector: {
    features: string[];
    means: Record<string, number>;
    stds: Record<string, number>;
    bounds: Record<string, [number, number]>;
  };
}

const ML_ARTIFACTS = mlArtifactsRaw as unknown as MlArtifactsBundle;

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

function round1(v: number): number {
  return Number(v.toFixed(1));
}

function round2(v: number): number {
  return Number(v.toFixed(2));
}

function evaluateSingleTree(tree: SerializedDecisionTree, x: number[]): number {
  let node = 0;
  while (tree.childrenLeft[node] !== -1 && tree.childrenRight[node] !== -1) {
    const featIdx = tree.feature[node];
    const threshold = tree.threshold[node];
    node = x[featIdx] <= threshold ? tree.childrenLeft[node] : tree.childrenRight[node];
  }
  return tree.value[node] ?? 0;
}

function predictRandomForestSoilMoisture(features: number[]): number {
  const trees = ML_ARTIFACTS.soilMoistureForecaster.trees;
  if (!trees.length) return clamp(features[0] ?? 50, 5, 98);
  let sum = 0;
  for (const t of trees) {
    sum += evaluateSingleTree(t, features);
  }
  return clamp(sum / trees.length, 5, 98);
}

function predictGradientBoostedWaterDemand(features: number[]): number {
  const spec = ML_ARTIFACTS.irrigationWaterDemand;
  if (!spec.trees.length) return 3.0;
  let pred = spec.initPrediction;
  for (const t of spec.trees) {
    pred += spec.learningRate * evaluateSingleTree(t, features);
  }
  return clamp(pred, 0, 22);
}

export function getTrainedMlMetadataSummary() {
  return ML_ARTIFACTS.metadata;
}

/**
 * Predicts 1-day optimal irrigation water demand (mm/day) using the trained
 * chronological GradientBoostingRegressor tree ensemble.
 */
export function predictOptimalDailyWaterDemandMm(params: {
  soilMoisturePct: number;
  tempMaxC: number;
  humidityPct: number;
  rainMm: number;
  et0Mm: number;
  kc: number;
  tawMmM: number;
  dayOfYear?: number;
}): {
  recommendedIrrigationMm: number;
  modelName: string;
  algorithm: string;
  r2: number;
  mae: number;
} {
  const doy = params.dayOfYear ?? 165;
  const doySin = Math.sin((2 * Math.PI * doy) / 365.25);
  const doyCos = Math.cos((2 * Math.PI * doy) / 365.25);

  const recommendedIrrigationMm = round2(
    predictGradientBoostedWaterDemand([
      params.soilMoisturePct,
      params.tempMaxC,
      params.humidityPct,
      params.rainMm,
      params.et0Mm,
      params.kc,
      params.tawMmM,
      doySin,
      doyCos,
    ])
  );

  const meta = ML_ARTIFACTS.metadata.models.irrigation_water_demand;
  return {
    recommendedIrrigationMm,
    modelName: "irrigation_water_demand",
    algorithm: meta.algorithm,
    r2: meta.metrics.r2,
    mae: meta.metrics.mae,
  };
}

/**
 * Detects anomalous or physically impossible ESP32 sensor readings using both
 * trained statistical bounds and hardware soilFault flags.
 */
export function detectSensorAnomaly(reading: SensorReadingRecord | null): {
  anomalyDetected: boolean;
  reason: string | null;
} {
  if (!reading) return { anomalyDetected: false, reason: null };
  if (reading.soilFault || (reading.soilRaw !== null && reading.soilRaw >= 4000)) {
    return {
      anomalyDetected: true,
      reason:
        "Soil sensor raw signal exceeded fault threshold (>= 4000). Check probe cable and contact.",
    };
  }

  const sm = reading.soilMoisturePct;
  const temp = reading.airTempC;
  const hum = reading.airHumidityPct;
  const bounds = ML_ARTIFACTS.sensorAnomalyDetector.bounds;

  if (sm !== null && (sm < bounds.soil_moisture_t0[0] || sm > bounds.soil_moisture_t0[1])) {
    return {
      anomalyDetected: true,
      reason: `Measured soil moisture (${sm}%) is outside realistic field bounds (${bounds.soil_moisture_t0[0]}%–${bounds.soil_moisture_t0[1]}%).`,
    };
  }
  if (temp !== null && (temp < bounds.temp_max_c[0] || temp > bounds.temp_max_c[1])) {
    return {
      anomalyDetected: true,
      reason: `Measured air temperature (${temp}°C) is outside normal sensor bounds (${bounds.temp_max_c[0]}°C–${bounds.temp_max_c[1]}°C).`,
    };
  }
  if (hum !== null && (hum < bounds.humidity_pct[0] || hum > bounds.humidity_pct[1])) {
    return {
      anomalyDetected: true,
      reason: `Measured air humidity (${hum}%) is outside normal sensor bounds.`,
    };
  }
  return { anomalyDetected: false, reason: null };
}

/**
 * Optional call to running FastAPI ml_service; safely returns null if offline/unreachable.
 */
export async function checkPythonMlServiceHealth(): Promise<{
  reachable: boolean;
  url: string;
} | null> {
  const url = process.env.FARMBRAIN_ML_SERVICE_URL?.trim();
  if (!url) return null;
  const timeoutMs = Number(process.env.FARMBRAIN_ML_TIMEOUT_MS ?? 1800);
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(`${url.replace(/\/$/, "")}/health`, {
      signal: controller.signal,
    });
    clearTimeout(timer);
    return { reachable: res.ok, url };
  } catch {
    return { reachable: false, url };
  }
}

// ---------------------------------------------------------------------------
// Synthetic Climate Fallback (only when external weather/archive not cached yet)
// ---------------------------------------------------------------------------

const MONTH_NAMES_FULL = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function buildFallbackMonthlyClimate(lat: number, elevM = 50): MonthlyClimateSummary[] {
  const absLat = Math.abs(lat || 36.4);
  const tMeanBase = clamp(24 - Math.max(0, absLat - 25) * 0.42, 12, 29);
  return MONTH_NAMES_FULL.map((name, idx) => {
    const m = idx + 1;
    const phase = (2 * Math.PI * (m - 1)) / 12;
    const tMean = tMeanBase - 8.2 * Math.cos(phase);
    const tMin = tMean - 5.2;
    const tMax = tMean + 6.4;
    const rh = clamp(65 + 11 * Math.cos(phase), 35, 82);
    const rad = clamp(18.5 - 7.5 * Math.cos(phase), 8, 28);
    const days = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][idx];
    const et0Day = calculatePenmanMonteithET0({
      latitudeDeg: lat || 36.4,
      dayOfYear: idx * 30 + 15,
      tempMinC: tMin,
      tempMaxC: tMax,
      relativeHumidityPct: rh,
      windSpeed10mKmh: 8.5,
      solarRadiationMjM2Day: rad,
      elevationM: elevM,
    });
    const precip = Math.max(3, Math.round(32 + 24 * Math.cos(phase)));
    const et0Sum = et0Day * days;
    return {
      monthIndex: m,
      monthName: name,
      tempMinAvgC: round1(tMin),
      tempMaxAvgC: round1(tMax),
      tempMeanAvgC: round1(tMean),
      precipSumMm: precip,
      et0SumMm: round1(et0Sum),
      radiationAvgMjM2Day: round1(rad),
      rainyDays: Math.max(1, Math.round(precip / 8)),
      waterBalanceMm: round1(precip - et0Sum),
      growingDegreeDays: Math.max(0, Math.round((tMean - 10) * days)),
    };
  });
}

// ---------------------------------------------------------------------------
// FAO Paper 66 AquaCrop (Annual Crops) + FAO-33 Yield-Water (Perennial Orchards)
// ---------------------------------------------------------------------------

interface AquaCropAnnualSpec {
  name: string;
  cycleDays: number;
  cc0Pct: number;
  ccxPct: number;
  cgcPerDay: number;
  cdcPerDay: number;
  kcTrX: number;
  rootMinM: number;
  rootMaxM: number;
  pBase: number;
  wpStarGM2: number;
  hi0Pct: number;
  dryMatterFrac: number;
  ky: number;
}

const ANNUAL_AQUACROP_SPECS: Record<string, AquaCropAnnualSpec> = {
  tomato: { name: "Tomato", cycleDays: 135, cc0Pct: 1.2, ccxPct: 85, cgcPerDay: 0.105, cdcPerDay: 0.085, kcTrX: 1.15, rootMinM: 0.25, rootMaxM: 0.9, pBase: 0.4, wpStarGM2: 18, hi0Pct: 60, dryMatterFrac: 0.075, ky: 1.05 },
  wheat: { name: "Wheat", cycleDays: 155, cc0Pct: 1.8, ccxPct: 88, cgcPerDay: 0.085, cdcPerDay: 0.075, kcTrX: 1.15, rootMinM: 0.25, rootMaxM: 1.2, pBase: 0.55, wpStarGM2: 15, hi0Pct: 45, dryMatterFrac: 0.87, ky: 1.05 },
  barley: { name: "Barley", cycleDays: 140, cc0Pct: 1.8, ccxPct: 85, cgcPerDay: 0.09, cdcPerDay: 0.08, kcTrX: 1.1, rootMinM: 0.25, rootMaxM: 1.1, pBase: 0.6, wpStarGM2: 15, hi0Pct: 44, dryMatterFrac: 0.88, ky: 1.0 },
  maize: { name: "Maize", cycleDays: 130, cc0Pct: 1.0, ccxPct: 92, cgcPerDay: 0.115, cdcPerDay: 0.085, kcTrX: 1.2, rootMinM: 0.25, rootMaxM: 1.25, pBase: 0.55, wpStarGM2: 32, hi0Pct: 48, dryMatterFrac: 0.86, ky: 1.25 },
  potato: { name: "Potato", cycleDays: 120, cc0Pct: 1.5, ccxPct: 86, cgcPerDay: 0.11, cdcPerDay: 0.09, kcTrX: 1.15, rootMinM: 0.2, rootMaxM: 0.6, pBase: 0.35, wpStarGM2: 18, hi0Pct: 70, dryMatterFrac: 0.22, ky: 1.1 },
  sorghum: { name: "Sorghum", cycleDays: 125, cc0Pct: 1.2, ccxPct: 85, cgcPerDay: 0.105, cdcPerDay: 0.08, kcTrX: 1.1, rootMinM: 0.25, rootMaxM: 1.3, pBase: 0.55, wpStarGM2: 30, hi0Pct: 45, dryMatterFrac: 0.88, ky: 0.9 },
  soybean: { name: "Soybean", cycleDays: 125, cc0Pct: 1.2, ccxPct: 85, cgcPerDay: 0.095, cdcPerDay: 0.08, kcTrX: 1.15, rootMinM: 0.25, rootMaxM: 1.0, pBase: 0.5, wpStarGM2: 15, hi0Pct: 40, dryMatterFrac: 0.89, ky: 0.85 },
  cotton: { name: "Cotton", cycleDays: 165, cc0Pct: 1.0, ccxPct: 88, cgcPerDay: 0.085, cdcPerDay: 0.07, kcTrX: 1.18, rootMinM: 0.25, rootMaxM: 1.4, pBase: 0.6, wpStarGM2: 15, hi0Pct: 35, dryMatterFrac: 0.92, ky: 0.85 },
  rice: { name: "Rice", cycleDays: 135, cc0Pct: 1.5, ccxPct: 90, cgcPerDay: 0.105, cdcPerDay: 0.085, kcTrX: 1.2, rootMinM: 0.2, rootMaxM: 0.5, pBase: 0.25, wpStarGM2: 19, hi0Pct: 50, dryMatterFrac: 0.86, ky: 1.2 },
};

const PERENNIAL_FAO33_SPECS: Record<
  string,
  { name: string; cycleDays: number; kcMid: number; rootMaxM: number; pBase: number; ymTonHa: number; ky: number }
> = {
  olive: { name: "Olive", cycleDays: 240, kcMid: 0.7, rootMaxM: 1.5, pBase: 0.65, ymTonHa: 8.5, ky: 0.7 },
  citrus: { name: "Citrus", cycleDays: 270, kcMid: 0.75, rootMaxM: 1.25, pBase: 0.5, ymTonHa: 28.0, ky: 1.1 },
  date_palm: { name: "Date Palm", cycleDays: 300, kcMid: 0.95, rootMaxM: 2.0, pBase: 0.65, ymTonHa: 10.5, ky: 0.8 },
  grapes: { name: "Grapes", cycleDays: 180, kcMid: 0.85, rootMaxM: 1.5, pBase: 0.45, ymTonHa: 18.0, ky: 0.85 },
  almond: { name: "Almond", cycleDays: 210, kcMid: 0.9, rootMaxM: 1.6, pBase: 0.5, ymTonHa: 3.5, ky: 0.85 },
};

export interface CropGrowthSimulationOutput {
  modelUsed: "FAO_AQUACROP_P66" | "FAO33_WATER_PRODUCTION";
  cropCode: string;
  cropName: string;
  cycleDays: number;
  totalEtMMm: number;
  totalEtAMm: number;
  totalEffectiveRainMm: number;
  totalIrrigationMm: number;
  biomassTonHa: number | null;
  estimatedYieldTonHa: number;
  relativeYieldPct: number;
  dailySeries: Array<{
    day: number;
    canopyCoverPct: number;
    soilMoisturePct: number;
    biomassTonHa: number;
  }>;
}

export function simulateCropGrowthTs(params: {
  cropCode: string;
  dailyEt0Mm: number[];
  dailyRainMm: number[];
  dailyIrrigationMm?: number[];
  tawMmM?: number;
}): CropGrowthSimulationOutput {
  const code = params.cropCode.toLowerCase().trim();
  const tawMmM = Math.max(60, params.tawMmM ?? 150);

  if (code in ANNUAL_AQUACROP_SPECS) {
    const spec = ANNUAL_AQUACROP_SPECS[code];
    const days = Math.min(params.dailyEt0Mm.length, spec.cycleDays);
    const irr = params.dailyIrrigationMm ?? [];
    let depletion = tawMmM * spec.rootMinM * 0.25;
    let cc = spec.cc0Pct / 100;
    const ccx = spec.ccxPct / 100;
    let biomassGM2 = 0;
    let totalEtA = 0;
    let totalEtM = 0;
    let totalIrr = 0;
    let totalEffRain = 0;
    const dailySeries: CropGrowthSimulationOutput["dailySeries"] = [];

    for (let d = 0; d < days; d++) {
      const et0 = Math.max(0.3, params.dailyEt0Mm[d] ?? 4);
      const rain = Math.max(0, params.dailyRainMm[d] ?? 0);
      const applied = Math.max(0, irr[d] ?? 0);
      totalIrr += applied;

      const frac = Math.min(1, (d + 1) / Math.max(1, 0.55 * spec.cycleDays));
      const rootD = spec.rootMinM + (spec.rootMaxM - spec.rootMinM) * frac;
      const taw = tawMmM * rootD;
      const raw = taw * spec.pBase;
      const effRain = rain <= 35 ? rain * 0.85 : 35 * 0.85 + (rain - 35) * 0.55;
      totalEffRain += effRain;

      depletion = Math.max(0, depletion - effRain - applied);
      const ksExp =
        depletion <= raw * 0.85
          ? 1
          : Math.max(0.15, 1 - (depletion - raw * 0.85) / Math.max(10, taw - raw * 0.85));

      if (d < Math.floor(spec.cycleDays * 0.72)) {
        const cgcEff = spec.cgcPerDay * ksExp;
        cc =
          cc < ccx / 2
            ? Math.min(ccx, cc * Math.exp(cgcEff))
            : Math.min(ccx, ccx - (ccx - cc) * Math.exp(-cgcEff));
      } else {
        cc = Math.max(0.02, cc * Math.exp(-spec.cdcPerDay * (1.2 - 0.2 * ksExp)));
      }

      const ksSto =
        depletion <= raw ? 1 : Math.max(0.05, (taw - depletion) / Math.max(1, taw - raw));
      const kcTr = spec.kcTrX * Math.min(1, cc * 1.15);
      const trPot = kcTr * et0;
      const trAct = trPot * ksSto;
      const ke = (1 - cc) * (effRain + applied > 3 ? 0.9 : 0.25);
      const evap = ke * et0;
      totalEtM += trPot + evap;
      totalEtA += trAct + evap;
      depletion = Math.min(taw, depletion + trAct + evap);
      biomassGM2 += spec.wpStarGM2 * (trAct / et0);

      if (d % 5 === 0 || d === days - 1) {
        dailySeries.push({
          day: d + 1,
          canopyCoverPct: round1(cc * 100),
          soilMoisturePct: round1(clamp(100 * (1 - depletion / Math.max(1, taw)), 0, 100)),
          biomassTonHa: round2(biomassGM2 / 100),
        });
      }
    }

    const etRatio = totalEtA / Math.max(1, totalEtM);
    const hiAdj = (spec.hi0Pct / 100) * clamp(0.4 + 0.6 * etRatio, 0.55, 1.05);
    const freshYield = ((biomassGM2 / 100) * hiAdj) / spec.dryMatterFrac;

    return {
      modelUsed: "FAO_AQUACROP_P66",
      cropCode: code,
      cropName: spec.name,
      cycleDays: days,
      totalEtMMm: round1(totalEtM),
      totalEtAMm: round1(totalEtA),
      totalEffectiveRainMm: round1(totalEffRain),
      totalIrrigationMm: round1(totalIrr),
      biomassTonHa: round2(biomassGM2 / 100),
      estimatedYieldTonHa: round2(freshYield),
      relativeYieldPct: round1(clamp(100 * (1 - spec.ky * Math.max(0, 1 - etRatio)), 15, 100)),
      dailySeries,
    };
  }

  const cropSpec = getCropSpec(code);
  const per = PERENNIAL_FAO33_SPECS[code] ?? {
    name: cropSpec.name,
    cycleDays: 150,
    kcMid: cropSpec.kcMid,
    rootMaxM: cropSpec.rootDepthMaxM,
    pBase: cropSpec.depletionFractionP,
    ymTonHa: 16.0,
    ky: cropSpec.yieldResponseKy,
  };
  const days = Math.min(params.dailyEt0Mm.length, per.cycleDays);
  const irr = params.dailyIrrigationMm ?? [];
  const taw = tawMmM * per.rootMaxM;
  const raw = taw * per.pBase;
  let depletion = taw * 0.25;
  let totalEtM = 0;
  let totalEtA = 0;
  let totalIrr = 0;
  let totalEffRain = 0;
  const dailySeries: CropGrowthSimulationOutput["dailySeries"] = [];

  for (let d = 0; d < days; d++) {
    const et0 = Math.max(0.3, params.dailyEt0Mm[d] ?? 4);
    const rain = Math.max(0, params.dailyRainMm[d] ?? 0);
    const applied = Math.max(0, irr[d] ?? 0);
    totalIrr += applied;
    const effRain = rain * 0.85;
    totalEffRain += effRain;
    depletion = Math.max(0, depletion - effRain - applied);
    const ks = depletion <= raw ? 1 : Math.max(0.05, (taw - depletion) / Math.max(1, taw - raw));
    const etMDay = per.kcMid * et0;
    const etADay = etMDay * ks;
    totalEtM += etMDay;
    totalEtA += etADay;
    depletion = Math.min(taw, depletion + etADay);

    if (d % 7 === 0 || d === days - 1) {
      dailySeries.push({
        day: d + 1,
        canopyCoverPct: 70,
        soilMoisturePct: round1(clamp(100 * (1 - depletion / Math.max(1, taw)), 0, 100)),
        biomassTonHa: round2(per.ymTonHa * ((d + 1) / Math.max(1, days))),
      });
    }
  }

  const etRatio = totalEtA / Math.max(1, totalEtM);
  const relYield = clamp(1 - per.ky * Math.max(0, 1 - etRatio), 0.15, 1);

  return {
    modelUsed: "FAO33_WATER_PRODUCTION",
    cropCode: code,
    cropName: per.name,
    cycleDays: days,
    totalEtMMm: round1(totalEtM),
    totalEtAMm: round1(totalEtA),
    totalEffectiveRainMm: round1(totalEffRain),
    totalIrrigationMm: round1(totalIrr),
    biomassTonHa: null,
    estimatedYieldTonHa: round2(per.ymTonHa * relYield),
    relativeYieldPct: round1(relYield * 100),
    dailySeries,
  };
}

// ---------------------------------------------------------------------------
// Data Completeness & Provenance Auditor
// ---------------------------------------------------------------------------

export function evaluateDataCompleteness(params: {
  farm: FarmRecord;
  analysis?: CompleteFarmAnalysisBundle | null;
  sensors?: FarmSensorsBundle | null;
}): { pct: number; items: FarmBrainCompletenessItem[] } {
  const { farm, analysis, sensors } = params;
  const freshSensor =
    sensors?.latestReading &&
    !sensors.latestReading.soilFault &&
    Date.now() - new Date(sensors.latestReading.recordedAt).getTime() <= 24 * 60 * 60 * 1000;

  const hasCrops = (farm.crops?.length ?? 0) > 0;
  const hasPlantingDate = Boolean(farm.crops?.some((c) => Boolean(c.plantingDate)));
  const hasSolarProvided = Boolean(farm.solarConfig.isFarmerProvided);
  const hasPumpProvided = Boolean(farm.pumpConfig.isFarmerProvided);
  const hasWaterSource = (farm.farmerWaterSources?.length ?? 0) > 0 || (analysis?.waterSources.sources.length ?? 0) > 0;
  const soilMeasured = Boolean(freshSensor && sensors?.latestReading?.soilMoisturePct !== null);

  const items: Array<FarmBrainCompletenessItem & { weight: number }> = [
    {
      key: "location_boundary",
      label: "Farm location & field boundary",
      present: Boolean(farm.boundary && farm.areaHectares > 0),
      provenance: farm.boundaryVerified ? "MEASURED" : farm.boundary ? "FARMER_PROVIDED" : "ESTIMATED",
      impact: "HIGH",
      detail: farm.boundary
        ? `${farm.areaHectares.toFixed(1)} ha parcel mapped.`
        : `Using centroid area (${farm.areaHectares.toFixed(1)} ha). Drawing exact boundary improves accuracy.`,
      weight: 15,
    },
    {
      key: "crops_plots",
      label: "Registered crops & plot areas",
      present: hasCrops,
      provenance: hasCrops ? "FARMER_PROVIDED" : "SCIENTIFIC_DEFAULT",
      impact: "HIGH",
      detail: hasCrops
        ? `${farm.crops!.length} crop plot(s) registered.`
        : `Using primary crop (${farm.irrigationConfig.cropCode}).`,
      weight: 18,
    },
    {
      key: "planting_stage",
      label: "Planting dates & growth stages",
      present: hasPlantingDate,
      provenance: hasPlantingDate ? "FARMER_PROVIDED" : "ESTIMATED",
      impact: "MEDIUM",
      detail: hasPlantingDate
        ? "Planting calendar loaded for dynamic Kc stages."
        : "Estimated seasonal growth stage from planting month.",
      weight: 10,
    },
    {
      key: "soil_profile",
      label: "Soil texture & water capacity",
      present: Boolean(farm.soilProfile.textureClass),
      provenance: farm.soilProfile.source.toLowerCase().includes("farmer") ? "FARMER_PROVIDED" : "SCIENTIFIC_DEFAULT",
      impact: "MEDIUM",
      detail: `${farm.soilProfile.textureClass} (TAW ${farm.soilProfile.tawMmM} mm/m).`,
      weight: 12,
    },
    {
      key: "pump_specs",
      label: "Pump flow & pipe setup",
      present: hasPumpProvided,
      provenance: hasPumpProvided ? "FARMER_PROVIDED" : "SCIENTIFIC_DEFAULT",
      impact: "HIGH",
      detail: hasPumpProvided
        ? `${farm.pumpConfig.flowRateM3Hr} m³/h pump specs from profile.`
        : `Default ${farm.pumpConfig.flowRateM3Hr} m³/h pump profile assumed.`,
      weight: 15,
    },
    {
      key: "solar_setup",
      label: "Solar power configuration",
      present: hasSolarProvided || farm.solarConfig.solarStatus !== "NOT_SURE",
      provenance: hasSolarProvided ? "FARMER_PROVIDED" : "ESTIMATED",
      impact: "MEDIUM",
      detail:
        farm.solarConfig.solarStatus === "YES"
          ? `${farm.solarConfig.capacityKwp} kWp existing solar system.`
          : farm.solarConfig.solarStatus === "NO"
            ? "Grid / fuel pump operation (no solar installed)."
            : "Solar status unconfirmed.",
      weight: 10,
    },
    {
      key: "water_source",
      label: "Water source",
      present: hasWaterSource,
      provenance: (farm.farmerWaterSources?.length ?? 0) > 0 ? "FARMER_PROVIDED" : "ESTIMATED",
      impact: "MEDIUM",
      detail: hasWaterSource ? "Water source identified." : "No mapped or entered water source yet.",
      weight: 10,
    },
    {
      key: "live_sensor",
      label: "ESP32 live soil & weather sensor",
      present: soilMeasured,
      provenance: soilMeasured ? "MEASURED" : "ESTIMATED",
      impact: "HIGH",
      detail: soilMeasured
        ? `Live field reading (${sensors!.latestReading!.soilMoisturePct}% soil moisture).`
        : "No recent sensor reading in the last 24h; using weather model estimate.",
      weight: 10,
    },
  ];

  const totalWeight = items.reduce((s, i) => s + i.weight, 0);
  const achieved = items.reduce((s, i) => s + (i.present ? i.weight : i.weight * 0.35), 0);
  const pct = Math.round((achieved / totalWeight) * 100);

  return {
    pct,
    items: items.map((item) => ({
      key: item.key,
      label: item.label,
      present: item.present,
      provenance: item.provenance,
      impact: item.impact,
      detail: item.detail,
    })),
  };
}

// ---------------------------------------------------------------------------
// 7-Day Soil Moisture Forecast (Trained RandomForest + GradientBoosting)
// ---------------------------------------------------------------------------

function buildSoilMoistureForecast7d(params: {
  farm: FarmRecord;
  analysis?: CompleteFarmAnalysisBundle | null;
  sensors?: FarmSensorsBundle | null;
  kcAvg: number;
}): FarmBrainDailyMoistureForecastPoint[] {
  const { farm, analysis, sensors, kcAvg } = params;
  const freshValidSoil =
    sensors?.latestReading &&
    !sensors.latestReading.soilFault &&
    sensors.latestReading.soilMoisturePct !== null
      ? sensors.latestReading.soilMoisturePct
      : null;

  let currentMoisture = freshValidSoil ?? 52;
  const dailyForecast = analysis?.weather.daily ?? [];
  const tawMmM = farm.soilProfile.tawMmM || 150;
  const infMmHr = farm.soilProfile.infiltrationRateMmHr || 15;
  const p80 = ML_ARTIFACTS.soilMoistureForecaster.residualP80Pct;

  const out: FarmBrainDailyMoistureForecastPoint[] = [];
  const today = new Date();

  for (let i = 0; i < 7; i++) {
    const fc = dailyForecast[i];
    const d = new Date(today.getTime() + i * 86400_000);
    const dateStr = fc?.date ?? d.toISOString().slice(0, 10);
    const tempMax = fc?.tempMaxC ?? (analysis?.climate.monthly[d.getMonth()]?.tempMaxAvgC ?? 28);
    const hum = analysis?.weather.current.relativeHumidityPct ?? 55;
    const rain = fc?.precipMm ?? 0;
    const et0 = fc?.et0Mm ?? clamp(0.19 * Math.max(0, tempMax - 8) * (1 - 0.35 * (hum / 100)), 1.0, 8.0);
    const startOfYear = new Date(d.getFullYear(), 0, 0);
    const doy = Math.max(1, Math.floor((d.getTime() - startOfYear.getTime()) / 86400_000));
    const doySin = Math.sin((2 * Math.PI * doy) / 365.25);
    const doyCos = Math.cos((2 * Math.PI * doy) / 365.25);

    const recIrrMm = predictGradientBoostedWaterDemand([
      currentMoisture,
      tempMax,
      hum,
      rain,
      et0,
      kcAvg,
      tawMmM,
      doySin,
      doyCos,
    ]);

    const nextMoisture = predictRandomForestSoilMoisture([
      currentMoisture,
      tempMax,
      hum,
      rain,
      et0,
      recIrrMm,
      kcAvg,
      tawMmM,
      infMmHr,
      doySin,
      doyCos,
    ]);

    const band = p80 * (1 + 0.14 * i);
    out.push({
      dayIndex: i,
      date: dateStr,
      expectedMoisturePct: round1(nextMoisture),
      lowerBandPct: round1(clamp(nextMoisture - band, 5, 98)),
      upperBandPct: round1(clamp(nextMoisture + band, 5, 98)),
      rainMm: round1(rain),
      et0Mm: round1(et0),
      recommendedIrrigationMm: round1(recIrrMm),
      method: "ML_RANDOM_FOREST",
    });

    currentMoisture = nextMoisture;
  }

  return out;
}

// ---------------------------------------------------------------------------
// Feature One: Complete Farm Potential & Savings Analysis
// ---------------------------------------------------------------------------

function normalizePlots(farm: FarmRecord): FarmCropRecord[] {
  if (farm.crops && farm.crops.length > 0) {
    return farm.crops;
  }
  return [
    {
      id: `plot_${farm.id}_primary`,
      farmId: farm.id,
      cropCode: farm.irrigationConfig.cropCode || "tomato",
      cropName: getCropSpec(farm.irrigationConfig.cropCode || "tomato").name,
      cultivatedAreaHa: Math.max(0.05, farm.areaHectares),
      areaUnit: "ha",
      plantingDate: null,
      growthStage: "MID",
      plotCount: 1,
      plantingDensity: null,
      irrigationMethod: farm.irrigationConfig.irrigationMethod || "DRIP",
    },
  ];
}

export function computeFarmBrainAnalysis(params: {
  farm: FarmRecord;
  analysis?: CompleteFarmAnalysisBundle | null;
  sensors?: FarmSensorsBundle | null;
  waterTariffTndPerM3?: number | null;
  electricityTariffTndPerKwh?: number | null;
  previousVersion?: number;
}): FarmBrainAnalysisRecord {
  const { farm, analysis, sensors } = params;
  const nowIso = new Date().toISOString();
  const plots = normalizePlots(farm);
  const monthlyClimate =
    analysis?.climate.monthly && analysis.climate.monthly.length === 12
      ? analysis.climate.monthly
      : buildFallbackMonthlyClimate(farm.centerLat, farm.elevationM ?? 50);

  const suitabilityScores = rankCropSuitability(monthlyClimate, farm.irrigationConfig.plantingMonth || 3);
  const dailyEt0Season = monthlyClimate.flatMap((m) => Array(25).fill(round2(m.et0SumMm / 30)));
  const dailyRainSeason = monthlyClimate.flatMap((m) => Array(25).fill(round2(m.precipSumMm / 30)));

  const plotBreakdowns: FarmBrainPlotBreakdown[] = [];
  let totalBaselineWaterM3 = 0;
  let totalSmartWaterM3 = 0;
  let weightedKcSum = 0;
  let totalArea = 0;

  for (const plot of plots) {
    const spec = getCropSpec(plot.cropCode);
    const req = calculateCropWaterRequirements({
      cropCode: plot.cropCode,
      irrigatedAreaHa: plot.cultivatedAreaHa,
      irrigationMethod: plot.irrigationMethod,
      plantingMonth: farm.irrigationConfig.plantingMonth || 3,
      monthlyClimate,
      soilProfile: farm.soilProfile,
      pumpFlowRateM3Hr: farm.pumpConfig.flowRateM3Hr,
    });

    // Baseline (without FarmBrain): farmers using fixed schedules & manual estimation apply ~19% excess
    // under drip or up to ~38% excess under furrow/sprinkler/manual due to lack of weather/sensor scheduling.
    const methodMeta = IRRIGATION_EFFICIENCY_DEFAULTS[plot.irrigationMethod] ?? IRRIGATION_EFFICIENCY_DEFAULTS.DRIP;
    const baselineOveruseMultiplier =
      methodMeta.efficiencyPct >= 88
        ? 1.18
        : methodMeta.efficiencyPct >= 75
          ? 1.28
          : 1.38;

    const baselineWaterM3Yr = Math.round(req.annualGrossVolumeM3 * baselineOveruseMultiplier);
    // Smart FarmBrain eliminates excess deep percolation & skips rain days (~12% net reduction even vs nominal schedule)
    const smartMethodEfficiency = Math.max(methodMeta.efficiencyPct, 90);
    const smartWaterM3Yr = Math.round(
      req.annualGrossVolumeM3 * (methodMeta.efficiencyPct / smartMethodEfficiency) * 0.91
    );
    const waterSavedM3Yr = Math.max(0, baselineWaterM3Yr - smartWaterM3Yr);

    const cropSim = simulateCropGrowthTs({
      cropCode: plot.cropCode,
      dailyEt0Mm: dailyEt0Season,
      dailyRainMm: dailyRainSeason,
      dailyIrrigationMm: dailyEt0Season.map((e, i) => Math.max(0, e * spec.kcMid - (dailyRainSeason[i] ?? 0))),
      tawMmM: farm.soilProfile.tawMmM,
    });

    const suit = suitabilityScores.find((s) => s.cropCode === plot.cropCode)?.score ?? 70;
    const stageStr = (plot.growthStage ?? "MID").toUpperCase();
    const stageMult =
      stageStr.includes("FLOWER") || stageStr.includes("FRUIT") || stageStr.includes("MID")
        ? 1.35
        : stageStr.includes("VEG") || stageStr.includes("DEV")
          ? 1.15
          : 0.9;
    const priorityScore = round2(spec.yieldResponseKy * stageMult * (spec.droughtTolerance === "Low" ? 1.25 : spec.droughtTolerance === "Moderate" ? 1.05 : 0.85));

    plotBreakdowns.push({
      plotId: plot.id,
      cropCode: plot.cropCode,
      cropName: plot.cropName || spec.name,
      areaHa: round2(plot.cultivatedAreaHa),
      growthStage: stageStr,
      irrigationMethod: plot.irrigationMethod,
      baselineWaterM3Yr,
      smartWaterM3Yr,
      waterSavedM3Yr,
      efficiencyGainPct: round1((waterSavedM3Yr / Math.max(1, baselineWaterM3Yr)) * 100),
      suitabilityScore: suit,
      yieldResponseModel: cropSim.modelUsed,
      estimatedYieldTonHa: cropSim.estimatedYieldTonHa,
      priorityScore,
    });

    totalBaselineWaterM3 += baselineWaterM3Yr;
    totalSmartWaterM3 += smartWaterM3Yr;
    weightedKcSum += spec.kcMid * plot.cultivatedAreaHa;
    totalArea += plot.cultivatedAreaHa;
  }

  const pumpResult =
    analysis?.pump ??
    calculatePumpEnergy({
      flowRateM3Hr: farm.pumpConfig.flowRateM3Hr || 20,
      staticElevationDiffM: farm.pumpConfig.staticHeadM || 15,
      pipeLengthM: farm.pumpConfig.pipeLengthM || 180,
      pipeDiameterMm: farm.pumpConfig.pipeDiameterMm || 75,
      pipeMaterialC: farm.pumpConfig.pipeMaterialC || 140,
      operatingPressureHeadM: farm.pumpConfig.operatingPressureHeadM || 15,
      pumpEfficiencyPct: farm.pumpConfig.pumpEfficiencyPct || 65,
      motorEfficiencyPct: farm.pumpConfig.motorEfficiencyPct || 88,
      operatingHoursDay: farm.pumpConfig.operatingHoursDay || 6,
    });

  const specificKwhPerM3 = pumpResult.specificEnergyKwhPerM3 || 0.2;
  const baselineEnergyKwhYr = Math.round(totalBaselineWaterM3 * specificKwhPerM3);
  const smartEnergyKwhYr = Math.round(totalSmartWaterM3 * specificKwhPerM3);
  const energySavedKwhYr = Math.max(0, baselineEnergyKwhYr - smartEnergyKwhYr);
  const waterSavedM3Yr = Math.max(0, totalBaselineWaterM3 - totalSmartWaterM3);

  // Strict Solar-Free Electricity Rule
  const solarCoveragePct = analysis?.solarVsPump.annualCoveragePct ?? (farm.solarConfig.solarStatus === "YES" ? 100 : 0);
  const solarCoversPumpElectricity =
    farm.solarConfig.solarStatus === "YES" &&
    farm.solarConfig.capacityKwp > 0 &&
    (solarCoveragePct >= 95 || !farm.solarConfig.hasGridConnection);

  const gridFraction = solarCoversPumpElectricity
    ? 0
    : farm.solarConfig.solarStatus === "YES"
      ? clamp(1 - solarCoveragePct / 100, 0, 1)
      : 1;

  const waterTariff = params.waterTariffTndPerM3 ?? null;
  const elecTariff = params.electricityTariffTndPerKwh ?? null;

  const baselineWaterCostTndYr = waterTariff !== null ? round2(totalBaselineWaterM3 * waterTariff) : 0;
  const smartWaterCostTndYr = waterTariff !== null ? round2(totalSmartWaterM3 * waterTariff) : 0;
  const waterCostSavedTndYr = Math.max(0, round2(baselineWaterCostTndYr - smartWaterCostTndYr));

  const baselineEnergyCostTndYr =
    solarCoversPumpElectricity || elecTariff === null
      ? 0
      : round2(baselineEnergyKwhYr * gridFraction * elecTariff);
  const smartEnergyCostTndYr =
    solarCoversPumpElectricity || elecTariff === null
      ? 0
      : round2(smartEnergyKwhYr * gridFraction * elecTariff);
  const energyCostSavedTndYr = Math.max(0, round2(baselineEnergyCostTndYr - smartEnergyCostTndYr));

  const baselineManualHoursYr = Math.round(135 + plots.length * 42 + totalArea * 8);
  const smartManualHoursYr = Math.round(baselineManualHoursYr * 0.25);

  const methodologyNotes: string[] = [
    `Baseline vs. Smart comparison uses FAO-56 Penman-Monteith ETc across ${plots.length} plot(s) with pump specific energy ${specificKwhPerM3} kWh/m³.`,
  ];
  if (solarCoversPumpElectricity) {
    methodologyNotes.push(
      "Solar covers your pump electricity — grid electricity cost and TND electricity savings are fixed at 0 TND (you still save pump run-hours and battery/panel headroom)."
    );
  } else if (elecTariff === null || waterTariff === null) {
    methodologyNotes.push(
      "Enter your local water (TND/m³) and STEG electricity (TND/kWh) tariffs to calculate exact dinar savings instead of estimating unknown rates."
    );
  }

  const savings: FarmBrainSavingsBreakdown = {
    baselineWaterM3Yr: totalBaselineWaterM3,
    smartWaterM3Yr: totalSmartWaterM3,
    waterSavedM3Yr,
    waterSavedLitresYr: waterSavedM3Yr * 1000,
    waterSavingsPct: round1((waterSavedM3Yr / Math.max(1, totalBaselineWaterM3)) * 100),
    baselineEnergyKwhYr,
    smartEnergyKwhYr,
    energySavedKwhYr,
    energySavingsPct: round1((energySavedKwhYr / Math.max(1, baselineEnergyKwhYr)) * 100),
    baselineManualHoursYr,
    smartManualHoursYr,
    timeSavedHoursYr: Math.max(0, baselineManualHoursYr - smartManualHoursYr),
    baselineWaterCostTndYr,
    smartWaterCostTndYr,
    waterCostSavedTndYr,
    baselineEnergyCostTndYr,
    smartEnergyCostTndYr,
    energyCostSavedTndYr,
    totalEstimatedSavingsTndYr: round2(waterCostSavedTndYr + energyCostSavedTndYr),
    solarCoversPumpElectricity,
    electricityTariffTndPerKwh: elecTariff,
    waterTariffTndPerM3: waterTariff,
    methodologyNotes,
  };

  // 3-Tier Verified Savings Tracking
  const readings24h = [...(sensors?.readings24h ?? [])].sort(
    (a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime()
  );
  const latestReading = sensors?.latestReading ?? null;
  const freshSensorUsed = Boolean(
    latestReading && Date.now() - new Date(latestReading.recordedAt).getTime() <= 15 * 60_000
  );

  let observedPumpHours24h = 0;
  let observedPumpCycles24h = 0;
  for (let i = 0; i < readings24h.length; i++) {
    const cur = readings24h[i];
    const prev = readings24h[i - 1];
    if (cur.pumpOn && (!prev || !prev.pumpOn)) {
      observedPumpCycles24h += 1;
    }
    if (prev && prev.pumpOn) {
      const dtH = Math.min(
        2,
        Math.max(0, (new Date(cur.recordedAt).getTime() - new Date(prev.recordedAt).getTime()) / 3600_000)
      );
      observedPumpHours24h += dtH;
    }
  }
  observedPumpHours24h = round2(Math.min(24, observedPumpHours24h));

  let tier: FarmBrainVerifiedSavingsTracking["tier"] = "INITIAL_PROJECTION";
  let sensorUpdatedWaterSavedM3Yr: number | null = null;
  let verifiedActualWaterSavedM3: number | null = null;
  let verifiedActualEnergySavedKwh: number | null = null;
  let verifiedActualSavingsTnd: number | null = null;
  let trackingExplanation =
    "Based on your farm profile and local climate. Connect an ESP32 sensor to track real water saved in the field.";

  if (readings24h.length >= 2) {
    tier = "VERIFIED_ACTUAL";
    const dailyBaselineM3 = totalBaselineWaterM3 / 365;
    const observedVolumeM3 = observedPumpHours24h * (farm.pumpConfig.flowRateM3Hr || 20);
    const saved24hM3 = Math.max(0, round2(dailyBaselineM3 - observedVolumeM3));
    const saved24hKwh = round2(saved24hM3 * specificKwhPerM3);
    verifiedActualWaterSavedM3 = saved24hM3;
    verifiedActualEnergySavedKwh = saved24hKwh;
    verifiedActualSavingsTnd =
      waterTariff !== null || (!solarCoversPumpElectricity && elecTariff !== null)
        ? round2(
            saved24hM3 * (waterTariff ?? 0) +
              (solarCoversPumpElectricity ? 0 : saved24hKwh * gridFraction * (elecTariff ?? 0))
          )
        : null;
    sensorUpdatedWaterSavedM3Yr = Math.round(saved24hM3 * 365);
    trackingExplanation = `Measured from ${readings24h.length} sensor readings over the past 24 hours (${observedPumpCycles24h} pump run(s), ${observedPumpHours24h} h active).`;
  } else if (latestReading && !latestReading.soilFault) {
    tier = "SENSOR_UPDATED_PROJECTION";
    const moistureFactor =
      latestReading.soilMoisturePct !== null && latestReading.soilMoisturePct > 65 ? 1.15 : 1.0;
    sensorUpdatedWaterSavedM3Yr = Math.round(waterSavedM3Yr * moistureFactor);
    trackingExplanation = `Projection updated with your live sensor reading (${latestReading.soilMoisturePct ?? "--"}% soil wetness). More 24h logs unlock verified actual savings.`;
  }

  const verifiedTracking: FarmBrainVerifiedSavingsTracking = {
    tier,
    initialProjectedWaterSavedM3Yr: waterSavedM3Yr,
    sensorUpdatedWaterSavedM3Yr,
    verifiedActualWaterSavedM3,
    verifiedActualEnergySavedKwh,
    verifiedActualSavingsTnd,
    observedPumpHours24h,
    observedPumpCycles24h,
    freshSensorUsed,
    lastSensorAt: latestReading?.recordedAt ?? null,
    explanation: trackingExplanation,
  };

  const completeness = evaluateDataCompleteness({ farm, analysis, sensors });
  const anomaly = detectSensorAnomaly(latestReading);
  const kcAvg = weightedKcSum / Math.max(0.01, totalArea);
  const forecast7d = buildSoilMoistureForecast7d({ farm, analysis, sensors, kcAvg });

  // Farmer-friendly 3-part recommendations
  const recommendations: FarmBrainExplainableAdvice[] = [
    {
      id: "rec_water_savings",
      priority: "HIGH",
      whatIsHappening: `You can save about ${Math.round(waterSavedM3Yr * 1000).toLocaleString()} litres (${waterSavedM3Yr.toLocaleString()} m³) of water every year (${savings.waterSavingsPct}%).`,
      why: "Watering only when the crop roots actually dry down avoids water draining past the roots in warm weather.",
      whatToDo:
        freshSensorUsed && latestReading?.soilMoisturePct !== null
          ? `Your soil sensor reads ${latestReading!.soilMoisturePct}% wetness right now — follow today's moisture cue instead of a fixed timer.`
          : "Use drip irrigation scheduling linked to today's heat and rain instead of fixed calendar watering.",
      estimatedImpact: `-${savings.waterSavingsPct}% water · -${energySavedKwhYr} kWh/year`,
      provenance: freshSensorUsed ? "MEASURED" : "FARMER_PROVIDED",
    },
  ];

  if (anomaly.anomalyDetected && anomaly.reason) {
    recommendations.unshift({
      id: "rec_sensor_anomaly",
      priority: "HIGH",
      whatIsHappening: "Your field soil sensor reading looks abnormal.",
      why: anomaly.reason,
      whatToDo: "Inspect the soil moisture cable and plug on the ESP32 box before acting on that single reading.",
      provenance: "MEASURED",
    });
  }

  if (forecast7d.some((d) => d.rainMm >= 5)) {
    const rainyDay = forecast7d.find((d) => d.rainMm >= 5)!;
    recommendations.push({
      id: "rec_rain_skip",
      priority: "MEDIUM",
      whatIsHappening: `Rain (${rainyDay.rainMm} mm) is expected around ${rainyDay.date}.`,
      why: "Irrigating right before useful rain wastes pumped water and washes nutrients down.",
      whatToDo: "Hold back watering before that rain day and check soil wetness afterward.",
      provenance: analysis ? "ESTIMATED" : "SCIENTIFIC_DEFAULT",
    });
  }

  if (solarCoversPumpElectricity) {
    recommendations.push({
      id: "rec_solar_free",
      priority: "LOW",
      whatIsHappening: "Solar panels already cover your pump's electricity.",
      why: "Your solar power makes pumping electricity free, so your real gain is saving water, pump wear, and manual time.",
      whatToDo: "Run irrigation mainly during sunny mid-day hours unless using a water storage tank.",
      provenance: farm.solarConfig.isFarmerProvided ? "FARMER_PROVIDED" : "ESTIMATED",
    });
  }

  const mlModelsUsed: FarmBrainAnalysisRecord["mlModelsUsed"] = [
    {
      modelName: "soil_moisture_forecaster",
      algorithm: ML_ARTIFACTS.metadata.models.soil_moisture_forecaster.algorithm,
      validationR2: ML_ARTIFACTS.metadata.models.soil_moisture_forecaster.metrics.r2,
      validationMae: ML_ARTIFACTS.metadata.models.soil_moisture_forecaster.metrics.mae,
      source: "ARTIFACT_MODEL",
    },
    {
      modelName: "irrigation_water_demand",
      algorithm: ML_ARTIFACTS.metadata.models.irrigation_water_demand.algorithm,
      validationR2: ML_ARTIFACTS.metadata.models.irrigation_water_demand.metrics.r2,
      validationMae: ML_ARTIFACTS.metadata.models.irrigation_water_demand.metrics.mae,
      source: "ARTIFACT_MODEL",
    },
    {
      modelName: "sensor_anomaly_detector",
      algorithm: ML_ARTIFACTS.metadata.models.sensor_anomaly_detector.algorithm,
      validationR2: ML_ARTIFACTS.metadata.models.sensor_anomaly_detector.metrics.r2,
      validationMae: ML_ARTIFACTS.metadata.models.sensor_anomaly_detector.metrics.mae,
      source: "ARTIFACT_MODEL",
    },
  ];

  const assumptions = [
    `FAO-56 Penman-Monteith crop evapotranspiration computed per crop plot using ${analysis ? "fetched NASA/Open-Meteo climate" : "latitude-calibrated seasonal climate defaults"}.`,
    `Trained ML soil moisture and daily demand models evaluated on strict chronological holdout (${ML_ARTIFACTS.metadata.trainSamples} train / ${ML_ARTIFACTS.metadata.testSamples} test days after ${ML_ARTIFACTS.metadata.splitDate}).`,
  ];
  const limitations: string[] = [];
  if (!analysis) {
    limitations.push("Full weather/satellite bundle not yet run; monthly climate was estimated from coordinates.");
  }
  if (!latestReading) {
    limitations.push("No live ESP32 soil sensor data available yet; initial forecast starts from modeled soil wetness.");
  }

  return {
    id: `fb_${farm.id}_v${(params.previousVersion ?? 0) + 1}_${Date.now()}`,
    farmId: farm.id,
    userId: farm.userId,
    version: (params.previousVersion ?? 0) + 1,
    dataCompletenessPct: completeness.pct,
    completenessItems: completeness.items,
    savings,
    verifiedTracking,
    soilMoistureForecast7d: forecast7d,
    plotBreakdowns,
    recommendations,
    soilAnomalyDetected: anomaly.anomalyDetected,
    soilAnomalyReason: anomaly.reason,
    mlModelsUsed,
    assumptions,
    limitations,
    generatedAt: nowIso,
    updatedAt: nowIso,
  };
}

// ---------------------------------------------------------------------------
// Constrained Water Allocation Optimizer (KKT Water-Filling — Not Equal Split)
// ---------------------------------------------------------------------------

export interface WaterAllocationInputPlot {
  plotId: string;
  cropCode: string;
  cropName: string;
  areaHa: number;
  growthStage: string;
  dailyNeedLitres: number;
  priorityWeight: number;
  ky: number;
}

export function allocateWaterKKT(
  availableLitres: number,
  plots: WaterAllocationInputPlot[]
): SimulationPlotAllocation[] {
  if (plots.length === 0) return [];
  const totalNeed = plots.reduce((s, p) => s + p.dailyNeedLitres, 0);

  if (availableLitres >= totalNeed) {
    return plots.map((p) => ({
      plotId: p.plotId,
      cropCode: p.cropCode,
      cropName: p.cropName,
      areaHa: p.areaHa,
      growthStage: p.growthStage,
      requestedLitresDay: Math.round(p.dailyNeedLitres),
      allocatedLitresDay: Math.round(p.dailyNeedLitres),
      fulfillmentPct: 100,
      estimatedYieldImpactPct: 0,
      priorityWeight: p.priorityWeight,
      rationale: "Available water meets 100% of crop demand today.",
    }));
  }

  if (availableLitres <= 0) {
    return plots.map((p) => ({
      plotId: p.plotId,
      cropCode: p.cropCode,
      cropName: p.cropName,
      areaHa: p.areaHa,
      growthStage: p.growthStage,
      requestedLitresDay: Math.round(p.dailyNeedLitres),
      allocatedLitresDay: 0,
      fulfillmentPct: 0,
      estimatedYieldImpactPct: round1(-Math.min(85, p.ky * 80)),
      priorityWeight: p.priorityWeight,
      rationale: "No water available; crop relies solely on stored root-zone moisture.",
    }));
  }

  // Water-filling weighted proportional to (priorityWeight * need): ensures strict
  // feasibility (sum <= availableLitres) AND protects sensitive crops over hardy ones.
  let lo = 0;
  let hi = Math.max(...plots.map((p) => p.priorityWeight * Math.max(1, p.dailyNeedLitres))) + 10;
  for (let iter = 0; iter < 65; iter++) {
    const mid = 0.5 * (lo + hi);
    const sum = plots.reduce(
      (s, p) => s + Math.min(p.dailyNeedLitres, Math.max(0, (p.priorityWeight * Math.max(1, p.dailyNeedLitres)) / Math.max(mid, 1e-9) - 1)),
      0
    );
    if (sum > availableLitres) lo = mid;
    else hi = mid;
  }

  const lam = 0.5 * (lo + hi);
  const rawAllocs = plots.map((p) =>
    Math.min(
      p.dailyNeedLitres,
      Math.max(0, (p.priorityWeight * Math.max(1, p.dailyNeedLitres)) / Math.max(lam, 1e-9) - 1)
    )
  );
  // Floating-point safeguard ensuring total never exceeds availableLitres
  const rawSum = rawAllocs.reduce((s, v) => s + v, 0);
  const scaleDown = rawSum > availableLitres ? availableLitres / rawSum : 1;

  return plots.map((p, i) => {
    const allocated = Math.max(0, rawAllocs[i] * scaleDown);
    const fulfillment = p.dailyNeedLitres > 0 ? clamp((allocated / p.dailyNeedLitres) * 100, 0, 100) : 100;
    const yieldImpact = -p.ky * Math.max(0, 1 - fulfillment / 100) * 100;
    return {
      plotId: p.plotId,
      cropCode: p.cropCode,
      cropName: p.cropName,
      areaHa: p.areaHa,
      growthStage: p.growthStage,
      requestedLitresDay: Math.round(p.dailyNeedLitres),
      allocatedLitresDay: Math.round(allocated),
      fulfillmentPct: round1(fulfillment),
      estimatedYieldImpactPct: round1(Math.max(-85, yieldImpact)),
      priorityWeight: round2(p.priorityWeight),
      rationale:
        fulfillment >= 85
          ? `Prioritized (${fulfillment.toFixed(0)}% met) because ${p.cropName} is sensitive to drying at ${p.growthStage.toLowerCase()} stage.`
          : `Reduced to ${fulfillment.toFixed(0)}% to stretch limited water toward higher-sensitivity crops.`,
    };
  });
}

// ---------------------------------------------------------------------------
// Feature Two: Isolated Agricultural Decision Simulator (5 Scenarios)
// ---------------------------------------------------------------------------

function build30DayTrajectory(params: {
  initialMoisturePct: number;
  dailyEt0Mm: number;
  dailyRainMm: number;
  kc: number;
  tawMmM: number;
  strategy: "CURRENT" | "DAILY" | "EVERY_2_DAYS" | "MOISTURE_TRIGGER" | "AI_OPTIMIZED" | "SCARCE";
  moistureThresholdPct?: number;
  scarceRatio?: number;
}): {
  points: SimulationDailyTrajectoryPoint[];
  baselineTotalMm: number;
  simulatedTotalMm: number;
  avgMoistureSimPct: number;
} {
  let mBase = params.initialMoisturePct;
  let mSim = params.initialMoisturePct;
  let cumSavedMm = 0;
  let baselineTotalMm = 0;
  let simulatedTotalMm = 0;
  let simMoistureSum = 0;
  const taw = Math.max(80, params.tawMmM * 0.75);
  const start = new Date();
  const points: SimulationDailyTrajectoryPoint[] = [];

  for (let d = 0; d < 30; d++) {
    const dateStr = new Date(start.getTime() + d * 86400_000).toISOString().slice(0, 10);
    const rain = d % 9 === 5 ? params.dailyRainMm * 3 : 0;
    const effRain = rain * 0.85;
    const etc = params.kc * params.dailyEt0Mm;

    // Baseline: fixed every-2-days generous application
    const baseIrr = d % 2 === 0 ? Math.max(0, etc * 2.25) : 0;
    baselineTotalMm += baseIrr;
    mBase = clamp(mBase + ((effRain + baseIrr - etc) / taw) * 100 - 0.8 * Math.max(0, mBase - 78) * 0.05, 8, 96);

    let simIrr = 0;
    const threshold = params.moistureThresholdPct ?? 45;
    if (params.strategy === "DAILY") {
      simIrr = Math.max(0, etc - effRain);
    } else if (params.strategy === "EVERY_2_DAYS") {
      simIrr = d % 2 === 0 ? Math.max(0, etc * 1.9 - effRain) : 0;
    } else if (params.strategy === "MOISTURE_TRIGGER") {
      if (mSim < threshold) {
        simIrr = ((65 - mSim) / 100) * taw;
      }
    } else if (params.strategy === "AI_OPTIMIZED") {
      simIrr = predictGradientBoostedWaterDemand([
        mSim,
        29,
        55,
        rain,
        params.dailyEt0Mm,
        params.kc,
        params.tawMmM,
        Math.sin((2 * Math.PI * (150 + d)) / 365.25),
        Math.cos((2 * Math.PI * (150 + d)) / 365.25),
      ]);
      if (rain >= 4) simIrr = 0;
    } else if (params.strategy === "SCARCE") {
      simIrr = Math.max(0, (etc - effRain) * clamp(params.scarceRatio ?? 0.5, 0, 1));
    } else {
      simIrr = baseIrr;
    }

    simulatedTotalMm += simIrr;
    cumSavedMm += baseIrr - simIrr;
    mSim = clamp(mSim + ((effRain + simIrr - etc) / taw) * 100, 8, 96);
    simMoistureSum += mSim;

    points.push({
      day: d + 1,
      date: dateStr,
      baselineMoisturePct: round1(mBase),
      simulatedMoisturePct: round1(mSim),
      baselineIrrigationMm: round1(baseIrr),
      simulatedIrrigationMm: round1(simIrr),
      cumulativeWaterSavedM3: round1(cumSavedMm * 10), // per ha basis -> m3/ha * 1 = mm * 10
    });
  }

  return {
    points,
    baselineTotalMm: round1(baselineTotalMm),
    simulatedTotalMm: round1(simulatedTotalMm),
    avgMoistureSimPct: round1(simMoistureSum / 30),
  };
}

export function runFarmBrainSimulation(params: {
  farm: FarmRecord;
  analysis?: CompleteFarmAnalysisBundle | null;
  sensors?: FarmSensorsBundle | null;
  inputs: SimulationScenarioInputs;
}): SimulationScenarioResult {
  const { farm, analysis, sensors, inputs } = params;
  const baseBrain = computeFarmBrainAnalysis({
    farm,
    analysis,
    sensors,
    waterTariffTndPerM3: inputs.waterTariffTndPerM3 ?? null,
    electricityTariffTndPerKwh: inputs.electricityTariffTndPerKwh ?? null,
  });

  const plots = normalizePlots(farm);
  const monthlyClimate =
    analysis?.climate.monthly && analysis.climate.monthly.length === 12
      ? analysis.climate.monthly
      : buildFallbackMonthlyClimate(farm.centerLat, farm.elevationM ?? 50);

  const specificKwhPerM3 = analysis?.pump.specificEnergyKwhPerM3 ?? 0.2;
  const solarCoversAll = baseBrain.savings.solarCoversPumpElectricity;
  const solarCovBeforePct = analysis?.solarVsPump.annualCoveragePct ?? (solarCoversAll ? 100 : 0);
  const pumpFlow = Math.max(1, farm.pumpConfig.flowRateM3Hr || 20);
  const pumpMaxSafeHours = 18;
  const initMoisture =
    sensors?.latestReading && !sensors.latestReading.soilFault && sensors.latestReading.soilMoisturePct !== null
      ? sensors.latestReading.soilMoisturePct
      : 52;

  const avgDailyEt0 = round2(monthlyClimate.reduce((s, m) => s + m.et0SumMm, 0) / 365);
  const avgDailyRain = round2(monthlyClimate.reduce((s, m) => s + m.precipSumMm, 0) / 365);

  const baselineSeasonM3 = baseBrain.savings.smartWaterM3Yr;
  const baselineEnergyKwh = Math.round(baselineSeasonM3 * specificKwhPerM3);

  // Compute tariff delta helper respecting solar-free electricity
  const computeCostDeltaTnd = (waterDeltaM3: number, energyDeltaKwh: number): number | null => {
    const wT = inputs.waterTariffTndPerM3 ?? null;
    const eT = inputs.electricityTariffTndPerKwh ?? null;
    if (wT === null && (solarCoversAll || eT === null)) return null;
    const wCost = (wT ?? 0) * waterDeltaM3;
    const eCost = solarCoversAll || eT === null ? 0 : eT * energyDeltaKwh * clamp(1 - solarCovBeforePct / 100, 0, 1);
    return round2(wCost + eCost);
  };

  // --- SCENARIO A: WATER_SHORTAGE ---
  if (inputs.scenarioType === "WATER_SHORTAGE") {
    const availLitres = Math.max(0, inputs.availableWaterLitres ?? 2000);
    const totalFarmPeakNeedLitresDay = Math.max(
      1000,
      Math.round((baselineSeasonM3 / 365) * 1.45 * 1000)
    );

    const optInputPlots: WaterAllocationInputPlot[] = plots.map((plot, idx) => {
      const spec = getCropSpec(plot.cropCode);
      const bPlot = baseBrain.plotBreakdowns[idx];
      const stage = (plot.growthStage ?? "MID").toUpperCase();
      const dailyNeedLitres = Math.max(
        200,
        Math.round(((bPlot?.smartWaterM3Yr ?? baselineSeasonM3 / plots.length) / 365) * 1.45 * 1000)
      );
      return {
        plotId: plot.id,
        cropCode: plot.cropCode,
        cropName: plot.cropName || spec.name,
        areaHa: plot.cultivatedAreaHa,
        growthStage: stage,
        dailyNeedLitres,
        priorityWeight: bPlot?.priorityScore ?? spec.yieldResponseKy,
        ky: spec.yieldResponseKy,
      };
    });

    const allocations = allocateWaterKKT(availLitres, optInputPlots);
    const totalAllocatedDayLitres = allocations.reduce((s, a) => s + a.allocatedLitresDay, 0);
    const fulfillmentOverall = clamp(totalAllocatedDayLitres / Math.max(1, totalFarmPeakNeedLitresDay), 0, 1);
    const avgYieldImpact =
      allocations.reduce((s, a) => s + a.estimatedYieldImpactPct * a.areaHa, 0) /
      Math.max(0.01, farm.areaHectares);

    const simulatedSeasonM3 = Math.round(availLitres * 365 / 1000);
    const waterDeltaM3 = simulatedSeasonM3 - baselineSeasonM3;
    const simulatedEnergyKwh = Math.round(simulatedSeasonM3 * specificKwhPerM3);
    const traj = build30DayTrajectory({
      initialMoisturePct: initMoisture,
      dailyEt0Mm: avgDailyEt0,
      dailyRainMm: avgDailyRain,
      kc: 0.9,
      tawMmM: farm.soilProfile.tawMmM,
      strategy: "SCARCE",
      scarceRatio: fulfillmentOverall,
    });

    const reqHoursDay = round2(totalAllocatedDayLitres / 1000 / pumpFlow);
    return {
      scenarioType: "WATER_SHORTAGE",
      headlineOutcome:
        fulfillmentOverall >= 0.95
          ? `Your ${availLitres.toLocaleString()} L/day covers full crop demand across all plots.`
          : `With only ${availLitres.toLocaleString()} L/day, FarmBrain directs more water to sensitive crops (${allocations[0]?.cropName}) to protect yield.`,
      riskLevel: fulfillmentOverall < 0.5 ? "HIGH" : fulfillmentOverall < 0.8 ? "MODERATE" : "LOW",
      baselineWaterM3Season: baselineSeasonM3,
      simulatedWaterM3Season: simulatedSeasonM3,
      waterDeltaM3Season: waterDeltaM3,
      waterDeltaPct: round1((waterDeltaM3 / Math.max(1, baselineSeasonM3)) * 100),
      baselineEnergyKwhSeason: baselineEnergyKwh,
      simulatedEnergyKwhSeason: simulatedEnergyKwh,
      energyDeltaKwhSeason: simulatedEnergyKwh - baselineEnergyKwh,
      estimatedCostDeltaTnd: computeCostDeltaTnd(waterDeltaM3, simulatedEnergyKwh - baselineEnergyKwh),
      estimatedYieldChangePct: round1(avgYieldImpact),
      pumpOverloadRisk: reqHoursDay > pumpMaxSafeHours,
      pumpRequiredHoursDay: reqHoursDay,
      pumpMaxSafeHoursDay: pumpMaxSafeHours,
      solarCoverageBeforePct: round1(solarCovBeforePct),
      solarCoverageAfterPct: round1(solarCovBeforePct),
      allocations,
      trajectory30d: traj.points,
      explanation: {
        whatChanges: `Your available ${availLitres.toLocaleString()} L/day meets ${Math.round(fulfillmentOverall * 100)}% of peak need across ${plots.length} plot(s).`,
        whyItHappens: "Giving every plot the exact same cut wastes scarce water on hardy trees while drought-sensitive crops lose yield quickly.",
        whatFarmerShouldDo:
          allocations.length > 0
            ? `Open the valve longer for ${allocations.slice().sort((a, b) => b.fulfillmentPct - a.fulfillmentPct)[0].cropName} (${allocations.slice().sort((a, b) => b.fulfillmentPct - a.fulfillmentPct)[0].fulfillmentPct}% target) and stretch intervals on deeper-rooted crops.`
            : "Focus scarce water on flowering and fruiting rows first.",
      },
      assumptions: [
        "Constrained weighted allocation prioritizes crop sensitivity (FAO Ky), growth stage, and root capacity rather than equal splitting.",
        "Physical ESP32 relay and saved farm records remain completely untouched.",
      ],
      computedAt: new Date().toISOString(),
    };
  }

  // --- SCENARIO B: CHANGE_CROP ---
  if (inputs.scenarioType === "CHANGE_CROP") {
    const targetPlot =
      plots.find((p) => p.id === inputs.targetPlotId) ?? plots[0];
    const oldCode = targetPlot.cropCode;
    const newCode = inputs.newCropCode || "olive";
    const oldSpec = getCropSpec(oldCode);
    const newSpec = getCropSpec(newCode);

    const oldReq = calculateCropWaterRequirements({
      cropCode: oldCode,
      irrigatedAreaHa: targetPlot.cultivatedAreaHa,
      irrigationMethod: targetPlot.irrigationMethod,
      plantingMonth: farm.irrigationConfig.plantingMonth || 3,
      monthlyClimate,
      soilProfile: farm.soilProfile,
    });
    const newReq = calculateCropWaterRequirements({
      cropCode: newCode,
      irrigatedAreaHa: targetPlot.cultivatedAreaHa,
      irrigationMethod: targetPlot.irrigationMethod,
      plantingMonth: farm.irrigationConfig.plantingMonth || 3,
      monthlyClimate,
      soilProfile: farm.soilProfile,
    });

    const dailyEt0 = monthlyClimate.flatMap((m) => Array(25).fill(round2(m.et0SumMm / 30)));
    const dailyRain = monthlyClimate.flatMap((m) => Array(25).fill(round2(m.precipSumMm / 30)));
    const simOld = simulateCropGrowthTs({
      cropCode: oldCode,
      dailyEt0Mm: dailyEt0,
      dailyRainMm: dailyRain,
      dailyIrrigationMm: dailyEt0.map((e, i) => Math.max(0, e * oldSpec.kcMid - (dailyRain[i] ?? 0))),
      tawMmM: farm.soilProfile.tawMmM,
    });
    const simNew = simulateCropGrowthTs({
      cropCode: newCode,
      dailyEt0Mm: dailyEt0,
      dailyRainMm: dailyRain,
      dailyIrrigationMm: dailyEt0.map((e, i) => Math.max(0, e * newSpec.kcMid - (dailyRain[i] ?? 0))),
      tawMmM: farm.soilProfile.tawMmM,
    });

    const suits = rankCropSuitability(monthlyClimate, farm.irrigationConfig.plantingMonth || 3);
    const oldSuit = suits.find((s) => s.cropCode === oldCode)?.score ?? 70;
    const newSuit = suits.find((s) => s.cropCode === newCode)?.score ?? 70;

    const waterDelta = Math.round(newReq.annualGrossVolumeM3 - oldReq.annualGrossVolumeM3);
    const simulatedSeasonM3 = Math.max(0, baselineSeasonM3 + waterDelta);
    const simulatedEnergyKwh = Math.round(simulatedSeasonM3 * specificKwhPerM3);
    const solarAfter =
      solarCovBeforePct > 0
        ? clamp((solarCovBeforePct * baselineEnergyKwh) / Math.max(1, simulatedEnergyKwh), 0, 100)
        : 0;
    const traj = build30DayTrajectory({
      initialMoisturePct: initMoisture,
      dailyEt0Mm: avgDailyEt0,
      dailyRainMm: avgDailyRain,
      kc: newSpec.kcMid,
      tawMmM: farm.soilProfile.tawMmM,
      strategy: "AI_OPTIMIZED",
    });

    const reqHoursDay = round2((newReq.peakDailyWaterM3 + Math.max(0, baselineSeasonM3 / 365 - oldReq.annualGrossVolumeM3 / 365)) / pumpFlow);
    return {
      scenarioType: "CHANGE_CROP",
      headlineOutcome:
        waterDelta < 0
          ? `Switching to ${newSpec.name} saves about ${Math.abs(waterDelta).toLocaleString()} m³/year on this plot.`
          : `Switching to ${newSpec.name} requires about ${waterDelta.toLocaleString()} m³/year more water.`,
      riskLevel: newSuit < 55 || reqHoursDay > pumpMaxSafeHours ? "HIGH" : waterDelta > 0 ? "MODERATE" : "LOW",
      baselineWaterM3Season: baselineSeasonM3,
      simulatedWaterM3Season: simulatedSeasonM3,
      waterDeltaM3Season: waterDelta,
      waterDeltaPct: round1((waterDelta / Math.max(1, baselineSeasonM3)) * 100),
      baselineEnergyKwhSeason: baselineEnergyKwh,
      simulatedEnergyKwhSeason: simulatedEnergyKwh,
      energyDeltaKwhSeason: simulatedEnergyKwh - baselineEnergyKwh,
      estimatedCostDeltaTnd: computeCostDeltaTnd(waterDelta, simulatedEnergyKwh - baselineEnergyKwh),
      estimatedYieldChangePct: round1(simNew.relativeYieldPct - simOld.relativeYieldPct),
      pumpOverloadRisk: reqHoursDay > pumpMaxSafeHours,
      pumpRequiredHoursDay: reqHoursDay,
      pumpMaxSafeHoursDay: pumpMaxSafeHours,
      solarCoverageBeforePct: round1(solarCovBeforePct),
      solarCoverageAfterPct: round1(solarAfter),
      cropComparison: {
        currentCropCode: oldCode,
        currentCropName: oldSpec.name,
        newCropCode: newCode,
        newCropName: newSpec.name,
        currentSuitabilityScore: oldSuit,
        newSuitabilityScore: newSuit,
        currentCycleDays: simOld.cycleDays,
        newCycleDays: simNew.cycleDays,
        currentWaterM3Ha: Math.round(oldReq.annualGrossVolumeM3 / Math.max(0.01, targetPlot.cultivatedAreaHa)),
        newWaterM3Ha: Math.round(newReq.annualGrossVolumeM3 / Math.max(0.01, targetPlot.cultivatedAreaHa)),
        currentEstimatedYieldTonHa: simOld.estimatedYieldTonHa,
        newEstimatedYieldTonHa: simNew.estimatedYieldTonHa,
        yieldModelUsed: simNew.modelUsed,
      },
      trajectory30d: traj.points,
      explanation: {
        whatChanges: `${newSpec.name} needs ${Math.round(newReq.annualGrossVolumeM3 / Math.max(0.01, targetPlot.cultivatedAreaHa)).toLocaleString()} m³/ha/yr vs ${Math.round(oldReq.annualGrossVolumeM3 / Math.max(0.01, targetPlot.cultivatedAreaHa)).toLocaleString()} m³/ha/yr for ${oldSpec.name}.`,
        whyItHappens: `${newSpec.name} has ${newSpec.droughtTolerance.toLowerCase()} drought tolerance (${simNew.cycleDays} growing days, climate score ${newSuit}/100).`,
        whatFarmerShouldDo:
          waterDelta < 0
            ? `Good water-saving fit if market prices work for your farm (${newSpec.name} fits your soil and climate).`
            : `Ensure your well/reservoir and ${pumpFlow} m³/h pump can handle peak summer demand before switching.`,
      },
      assumptions: [
        `Yield estimated with ${simNew.modelUsed === "FAO_AQUACROP_P66" ? "FAO Paper 66 AquaCrop daily canopy/biomass model" : "FAO-56 + FAO-33 water-yield production function"}.`,
      ],
      computedAt: new Date().toISOString(),
    };
  }

  // --- SCENARIO C: WEATHER_CLIMATE ---
  if (inputs.scenarioType === "WEATHER_CLIMATE") {
    const tDelta = inputs.tempDeltaC ?? 3;
    const rainPct = inputs.rainChangePct ?? -40;
    const humDelta = inputs.humidityDeltaPct ?? -10;

    // FAO-56 ET0 increases ~3.8% per +1°C and ~0.5% per -1% RH drop
    const et0Scale = clamp(1 + tDelta * 0.038 - humDelta * 0.005, 0.75, 1.6);
    const rainScale = clamp(1 + rainPct / 100, 0, 2.5);

    const perturbedClimate: MonthlyClimateSummary[] = monthlyClimate.map((m) => ({
      ...m,
      tempMinAvgC: round1(m.tempMinAvgC + tDelta),
      tempMaxAvgC: round1(m.tempMaxAvgC + tDelta),
      tempMeanAvgC: round1(m.tempMeanAvgC + tDelta),
      et0SumMm: round1(m.et0SumMm * et0Scale),
      precipSumMm: round1(m.precipSumMm * rainScale),
    }));

    let simSeasonM3 = 0;
    for (const plot of plots) {
      const req = calculateCropWaterRequirements({
        cropCode: plot.cropCode,
        irrigatedAreaHa: plot.cultivatedAreaHa,
        irrigationMethod: plot.irrigationMethod,
        plantingMonth: farm.irrigationConfig.plantingMonth || 3,
        monthlyClimate: perturbedClimate,
        soilProfile: farm.soilProfile,
      });
      simSeasonM3 += Math.round(req.annualGrossVolumeM3 * 0.91);
    }

    const waterDelta = simSeasonM3 - baselineSeasonM3;
    const simEnergyKwh = Math.round(simSeasonM3 * specificKwhPerM3);
    const heatYieldPenalty = tDelta > 2.5 ? -(tDelta - 2.5) * 4.5 : tDelta < -3 ? -3.0 : 0;
    const reqHoursDay = round2(((simSeasonM3 / 365) * 1.45) / pumpFlow);
    const traj = build30DayTrajectory({
      initialMoisturePct: initMoisture,
      dailyEt0Mm: avgDailyEt0 * et0Scale,
      dailyRainMm: avgDailyRain * rainScale,
      kc: 0.9,
      tawMmM: farm.soilProfile.tawMmM,
      strategy: "CURRENT",
    });

    return {
      scenarioType: "WEATHER_CLIMATE",
      headlineOutcome:
        waterDelta > 0
          ? `Warmer/drier weather increases farm water need by +${waterDelta.toLocaleString()} m³/year (+${round1((waterDelta / Math.max(1, baselineSeasonM3)) * 100)}%).`
          : `Cooler/wetter weather reduces farm water need by ${Math.abs(waterDelta).toLocaleString()} m³/year.`,
      riskLevel: reqHoursDay > pumpMaxSafeHours || tDelta >= 4 ? "HIGH" : waterDelta > 0 ? "MODERATE" : "LOW",
      baselineWaterM3Season: baselineSeasonM3,
      simulatedWaterM3Season: simSeasonM3,
      waterDeltaM3Season: waterDelta,
      waterDeltaPct: round1((waterDelta / Math.max(1, baselineSeasonM3)) * 100),
      baselineEnergyKwhSeason: baselineEnergyKwh,
      simulatedEnergyKwhSeason: simEnergyKwh,
      energyDeltaKwhSeason: simEnergyKwh - baselineEnergyKwh,
      estimatedCostDeltaTnd: computeCostDeltaTnd(waterDelta, simEnergyKwh - baselineEnergyKwh),
      estimatedYieldChangePct: round1(heatYieldPenalty),
      pumpOverloadRisk: reqHoursDay > pumpMaxSafeHours,
      pumpRequiredHoursDay: reqHoursDay,
      pumpMaxSafeHoursDay: pumpMaxSafeHours,
      solarCoverageBeforePct: round1(solarCovBeforePct),
      solarCoverageAfterPct: round1(clamp((solarCovBeforePct * baselineEnergyKwh) / Math.max(1, simEnergyKwh), 0, 100)),
      trajectory30d: traj.points,
      explanation: {
        whatChanges: `A ${tDelta >= 0 ? "+" : ""}${tDelta}°C temperature shift and ${rainPct >= 0 ? "+" : ""}${rainPct}% rain change shifts water need by ${waterDelta >= 0 ? "+" : ""}${waterDelta.toLocaleString()} m³/year.`,
        whyItHappens: "Higher air heat and lower humidity draw water out of leaves and soil faster (higher crop evaporation).",
        whatFarmerShouldDo:
          waterDelta > 0
            ? "Shift watering to early morning or evening, mulch around roots to cut soil evaporation, and watch ESP32 soil moisture."
            : "Adjust timer schedules down so extra rainwater is not wasted.",
      },
      assumptions: ["FAO-56 climate sensitivity scaling ET0 by ~3.8% per +1°C and vapor pressure deficit change."],
      computedAt: new Date().toISOString(),
    };
  }

  // --- SCENARIO D: IRRIGATION_STRATEGY ---
  if (inputs.scenarioType === "IRRIGATION_STRATEGY") {
    const strategy = inputs.strategy ?? "AI_OPTIMIZED";
    const traj = build30DayTrajectory({
      initialMoisturePct: initMoisture,
      dailyEt0Mm: avgDailyEt0,
      dailyRainMm: avgDailyRain,
      kc: 0.9,
      tawMmM: farm.soilProfile.tawMmM,
      strategy,
      moistureThresholdPct: inputs.moistureThresholdPct ?? 45,
    });

    const ratio = traj.simulatedTotalMm / Math.max(1, traj.baselineTotalMm);
    const simSeasonM3 = Math.round(baselineSeasonM3 * ratio);
    const waterDelta = simSeasonM3 - baselineSeasonM3;
    const simEnergyKwh = Math.round(simSeasonM3 * specificKwhPerM3);
    const reqHoursDay = round2(((simSeasonM3 / 365) * 1.45) / pumpFlow);

    return {
      scenarioType: "IRRIGATION_STRATEGY",
      headlineOutcome:
        waterDelta < 0
          ? `${strategy.replace(/_/g, " ")} saves about ${Math.abs(waterDelta).toLocaleString()} m³/year (${Math.abs(round1((waterDelta / Math.max(1, baselineSeasonM3)) * 100))}%) while keeping root moisture steady.`
          : `${strategy.replace(/_/g, " ")} uses ${Math.abs(waterDelta).toLocaleString()} m³/year more water than smart baseline.`,
      riskLevel: traj.avgMoistureSimPct < 36 || reqHoursDay > pumpMaxSafeHours ? "HIGH" : waterDelta > 0 ? "MODERATE" : "LOW",
      baselineWaterM3Season: baselineSeasonM3,
      simulatedWaterM3Season: simSeasonM3,
      waterDeltaM3Season: waterDelta,
      waterDeltaPct: round1((waterDelta / Math.max(1, baselineSeasonM3)) * 100),
      baselineEnergyKwhSeason: baselineEnergyKwh,
      simulatedEnergyKwhSeason: simEnergyKwh,
      energyDeltaKwhSeason: simEnergyKwh - baselineEnergyKwh,
      estimatedCostDeltaTnd: computeCostDeltaTnd(waterDelta, simEnergyKwh - baselineEnergyKwh),
      estimatedYieldChangePct: traj.avgMoistureSimPct >= 44 ? 2.5 : -6.0,
      pumpOverloadRisk: reqHoursDay > pumpMaxSafeHours,
      pumpRequiredHoursDay: reqHoursDay,
      pumpMaxSafeHoursDay: pumpMaxSafeHours,
      solarCoverageBeforePct: round1(solarCovBeforePct),
      solarCoverageAfterPct: round1(clamp((solarCovBeforePct * baselineEnergyKwh) / Math.max(1, simEnergyKwh), 0, 100)),
      trajectory30d: traj.points,
      explanation: {
        whatChanges: `Over 30 simulated days, soil stays around ${traj.avgMoistureSimPct}% moisture using ${traj.simulatedTotalMm} mm instead of ${traj.baselineTotalMm} mm.`,
        whyItHappens:
          strategy === "AI_OPTIMIZED" || strategy === "MOISTURE_TRIGGER"
            ? "Watering only when the root zone crosses the target moisture avoids losing water before rain or deep below roots."
            : "Fixed calendar schedules apply water even on cool days when soil is already moist.",
        whatFarmerShouldDo: "Follow the AI/sensor schedule cue and let soil moisture drop safely between cycles without starving roots.",
      },
      assumptions: ["30-day soil water balance evaluated using trained GradientBoosting water-demand model and root-zone TAW."],
      computedAt: new Date().toISOString(),
    };
  }

  // --- SCENARIO E: FARM_EXPANSION ---
  const addedAreaHa = Math.max(0.1, inputs.addedAreaHa ?? 2);
  const addedCropCode = inputs.addedCropCode ?? (plots[0]?.cropCode || "tomato");
  const addedMethod: IrrigationMethod = inputs.addedIrrigationMethod ?? "DRIP";
  const addedReq = calculateCropWaterRequirements({
    cropCode: addedCropCode,
    irrigatedAreaHa: addedAreaHa,
    irrigationMethod: addedMethod,
    plantingMonth: farm.irrigationConfig.plantingMonth || 3,
    monthlyClimate,
    soilProfile: farm.soilProfile,
    pumpFlowRateM3Hr: pumpFlow,
  });

  const addedM3 = Math.round(addedReq.annualGrossVolumeM3 * 0.91);
  const simSeasonM3 = baselineSeasonM3 + addedM3;
  const simEnergyKwh = Math.round(simSeasonM3 * specificKwhPerM3);
  const peakDayBeforeM3 = analysis?.irrigation.peakDailyWaterM3 ?? (baselineSeasonM3 / 365) * 1.45;
  const peakDayAfterM3 = peakDayBeforeM3 + addedReq.peakDailyWaterM3;
  const reqHoursDay = round2(peakDayAfterM3 / pumpFlow);
  const pumpOverloadRisk = reqHoursDay > pumpMaxSafeHours;
  const solarAfter =
    solarCovBeforePct > 0
      ? clamp((solarCovBeforePct * baselineEnergyKwh) / Math.max(1, simEnergyKwh), 0, 100)
      : 0;

  const traj = build30DayTrajectory({
    initialMoisturePct: initMoisture,
    dailyEt0Mm: avgDailyEt0,
    dailyRainMm: avgDailyRain,
    kc: getCropSpec(addedCropCode).kcMid,
    tawMmM: farm.soilProfile.tawMmM,
    strategy: "AI_OPTIMIZED",
  });

  return {
    scenarioType: "FARM_EXPANSION",
    headlineOutcome: pumpOverloadRisk
      ? `Adding +${addedAreaHa} ha pushes peak pump runtime to ${reqHoursDay} h/day — pump upgrade or buffer tank needed.`
      : `Your pump can supply +${addedAreaHa} ha of ${getCropSpec(addedCropCode).name} (${reqHoursDay} h/day at peak).`,
    riskLevel: pumpOverloadRisk ? "HIGH" : solarAfter < 70 && farm.solarConfig.solarStatus === "YES" ? "MODERATE" : "LOW",
    baselineWaterM3Season: baselineSeasonM3,
    simulatedWaterM3Season: simSeasonM3,
    waterDeltaM3Season: addedM3,
    waterDeltaPct: round1((addedM3 / Math.max(1, baselineSeasonM3)) * 100),
    baselineEnergyKwhSeason: baselineEnergyKwh,
    simulatedEnergyKwhSeason: simEnergyKwh,
    energyDeltaKwhSeason: simEnergyKwh - baselineEnergyKwh,
    estimatedCostDeltaTnd: computeCostDeltaTnd(addedM3, simEnergyKwh - baselineEnergyKwh),
    estimatedYieldChangePct: 0,
    pumpOverloadRisk,
    pumpRequiredHoursDay: reqHoursDay,
    pumpMaxSafeHoursDay: pumpMaxSafeHours,
    solarCoverageBeforePct: round1(solarCovBeforePct),
    solarCoverageAfterPct: round1(solarAfter),
    trajectory30d: traj.points,
    explanation: {
      whatChanges: `Expanding by +${addedAreaHa} ha increases peak summer water demand from ${round1(peakDayBeforeM3)} m³/day to ${round1(peakDayAfterM3)} m³/day (${reqHoursDay} pump hours/day).`,
      whyItHappens: `Your current pump moves ${pumpFlow} m³/h; running more than ${pumpMaxSafeHours} hours daily leaves too little margin or solar daylight.`,
      whatFarmerShouldDo: pumpOverloadRisk
        ? "Add a water buffer tank, increase drip efficiency, or split watering zones before planting the new land."
        : "Use rotational zone valves on the new plot so total flow matches your current pipe capacity.",
    },
    assumptions: ["Peak expansion capacity checked against configured pump flowRateM3Hr and solar coverage ratio."],
    computedAt: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Scenario Comparator
// ---------------------------------------------------------------------------

export function compareSimulationScenarios(
  farmId: string,
  scenarios: SimulationScenarioRecord[]
): SimulationComparisonResult {
  const runnable = scenarios.filter((s) => s.result !== null);
  const rows = runnable.map((s) => {
    const r = s.result!;
    return {
      id: s.id,
      name: s.name,
      scenarioType: s.scenarioType,
      waterDeltaM3Season: r.waterDeltaM3Season,
      waterDeltaPct: r.waterDeltaPct,
      energyDeltaKwhSeason: r.energyDeltaKwhSeason,
      estimatedCostDeltaTnd: r.estimatedCostDeltaTnd,
      estimatedYieldChangePct: r.estimatedYieldChangePct,
      riskLevel: r.riskLevel,
      headlineOutcome: r.headlineOutcome,
    };
  });

  const bestWater = rows.slice().sort((a, b) => a.waterDeltaM3Season - b.waterDeltaM3Season)[0]?.id ?? null;
  const bestYield = rows.slice().sort((a, b) => b.estimatedYieldChangePct - a.estimatedYieldChangePct)[0]?.id ?? null;
  const riskPenalty: Record<string, number> = { LOW: 0, MODERATE: 15, HIGH: 40 };
  const bestOverall =
    rows
      .slice()
      .sort(
        (a, b) =>
          (b.estimatedYieldChangePct - 0.002 * b.waterDeltaM3Season - riskPenalty[b.riskLevel]) -
          (a.estimatedYieldChangePct - 0.002 * a.waterDeltaM3Season - riskPenalty[a.riskLevel])
      )[0]?.id ?? null;

  return {
    farmId,
    scenarios: rows,
    bestForWaterSavingId: bestWater,
    bestForYieldProtectionId: bestYield,
    bestOverallId: bestOverall,
    summary:
      rows.length >= 2
        ? `Compared ${rows.length} saved scenarios. Lowest water use: ${rows.find((r) => r.id === bestWater)?.name ?? "-"}.`
        : "Save and run at least two scenarios to compare outcomes side by side.",
    generatedAt: new Date().toISOString(),
  };
}
