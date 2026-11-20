import type {
  CropSpec,
  CropSuitabilityScore,
  CropWaterRequirementResult,
  FarmCropRecord,
  IrrigationMethod,
  MonthlyClimateSummary,
  MonthlyIrrigationDemand,
  SoilProfileData,
} from "@/types/agri";
import { IRRIGATION_EFFICIENCY_DEFAULTS, SOIL_TEXTURE_DEFAULTS } from "../db/defaults";

/**
 * PI-Advisor & FAO-56 Irrigation Decision Support Adaptation
 *
 * Reference repository investigated: https://github.com/wateraccounting/PI-Advisor
 * Architecture finding: PI-Advisor is a Python/Streamlit + Google Earth Engine application
 * implementing FAO-56 crop evapotranspiration (ETc = Kc * ETo) and root-zone soil water balance.
 * Because it is not a hosted REST API and relies on GEE Python credentials, this module implements
 * a verified, deterministic TypeScript FAO-56 Penman-Monteith & Soil Water Balance engine.
 */

export const CROP_DATABASE: CropSpec[] = [
  {
    code: "tomato",
    name: "Field Tomato",
    scientificName: "Solanum lycopersicum",
    category: "Horticulture",
    kcIni: 0.6,
    kcMid: 1.15,
    kcEnd: 0.8,
    stageIniDays: 30,
    stageDevDays: 40,
    stageMidDays: 45,
    stageLateDays: 30,
    rootDepthMinM: 0.3,
    rootDepthMaxM: 1.0,
    depletionFractionP: 0.4,
    yieldResponseKy: 1.05,
    optimalTempMinC: 18,
    optimalTempMaxC: 29,
    droughtTolerance: "Low",
    salinityToleranceDsm: 2.5,
  },
  {
    code: "citrus",
    name: "Citrus Orchard (70% Canopy)",
    scientificName: "Citrus sinensis",
    category: "Perennial Orchard",
    kcIni: 0.7,
    kcMid: 0.65,
    kcEnd: 0.7,
    stageIniDays: 60,
    stageDevDays: 90,
    stageMidDays: 120,
    stageLateDays: 95,
    rootDepthMinM: 0.8,
    rootDepthMaxM: 1.4,
    depletionFractionP: 0.5,
    yieldResponseKy: 1.1,
    optimalTempMinC: 14,
    optimalTempMaxC: 32,
    droughtTolerance: "Moderate",
    salinityToleranceDsm: 1.7,
  },
  {
    code: "olive",
    name: "Olive Grove",
    scientificName: "Olea europaea",
    category: "Perennial Orchard",
    kcIni: 0.55,
    kcMid: 0.7,
    kcEnd: 0.65,
    stageIniDays: 60,
    stageDevDays: 90,
    stageMidDays: 120,
    stageLateDays: 95,
    rootDepthMinM: 1.0,
    rootDepthMaxM: 1.7,
    depletionFractionP: 0.65,
    yieldResponseKy: 0.85,
    optimalTempMinC: 12,
    optimalTempMaxC: 34,
    droughtTolerance: "High",
    salinityToleranceDsm: 3.8,
  },
  {
    code: "wheat",
    name: "Winter / Spring Wheat",
    scientificName: "Triticum aestivum",
    category: "Cereal",
    kcIni: 0.3,
    kcMid: 1.15,
    kcEnd: 0.35,
    stageIniDays: 30,
    stageDevDays: 55,
    stageMidDays: 60,
    stageLateDays: 35,
    rootDepthMinM: 0.3,
    rootDepthMaxM: 1.5,
    depletionFractionP: 0.55,
    yieldResponseKy: 1.05,
    optimalTempMinC: 10,
    optimalTempMaxC: 24,
    droughtTolerance: "Moderate",
    salinityToleranceDsm: 6.0,
  },
  {
    code: "maize",
    name: "Grain Maize (Corn)",
    scientificName: "Zea mays",
    category: "Cereal",
    kcIni: 0.3,
    kcMid: 1.2,
    kcEnd: 0.5,
    stageIniDays: 25,
    stageDevDays: 40,
    stageMidDays: 45,
    stageLateDays: 30,
    rootDepthMinM: 0.3,
    rootDepthMaxM: 1.3,
    depletionFractionP: 0.55,
    yieldResponseKy: 1.25,
    optimalTempMinC: 18,
    optimalTempMaxC: 32,
    droughtTolerance: "Low",
    salinityToleranceDsm: 1.7,
  },
  {
    code: "potato",
    name: "Potato",
    scientificName: "Solanum tuberosum",
    category: "Tuber",
    kcIni: 0.5,
    kcMid: 1.15,
    kcEnd: 0.75,
    stageIniDays: 25,
    stageDevDays: 30,
    stageMidDays: 45,
    stageLateDays: 30,
    rootDepthMinM: 0.25,
    rootDepthMaxM: 0.6,
    depletionFractionP: 0.35,
    yieldResponseKy: 1.1,
    optimalTempMinC: 14,
    optimalTempMaxC: 24,
    droughtTolerance: "Low",
    salinityToleranceDsm: 1.7,
  },
  {
    code: "alfalfa",
    name: "Alfalfa (Forage Hay)",
    scientificName: "Medicago sativa",
    category: "Forage",
    kcIni: 0.4,
    kcMid: 1.2,
    kcEnd: 1.15,
    stageIniDays: 30,
    stageDevDays: 60,
    stageMidDays: 180,
    stageLateDays: 95,
    rootDepthMinM: 0.6,
    rootDepthMaxM: 1.8,
    depletionFractionP: 0.55,
    yieldResponseKy: 1.1,
    optimalTempMinC: 12,
    optimalTempMaxC: 30,
    droughtTolerance: "Moderate",
    salinityToleranceDsm: 2.0,
  },
  {
    code: "sorghum",
    name: "Grain Sorghum",
    scientificName: "Sorghum bicolor",
    category: "Cereal",
    kcIni: 0.3,
    kcMid: 1.05,
    kcEnd: 0.55,
    stageIniDays: 20,
    stageDevDays: 35,
    stageMidDays: 45,
    stageLateDays: 30,
    rootDepthMinM: 0.4,
    rootDepthMaxM: 1.6,
    depletionFractionP: 0.55,
    yieldResponseKy: 0.9,
    optimalTempMinC: 20,
    optimalTempMaxC: 35,
    droughtTolerance: "High",
    salinityToleranceDsm: 6.8,
  },
  {
    code: "soybean",
    name: "Soybean",
    scientificName: "Glycine max",
    category: "Legume",
    kcIni: 0.4,
    kcMid: 1.15,
    kcEnd: 0.5,
    stageIniDays: 20,
    stageDevDays: 35,
    stageMidDays: 60,
    stageLateDays: 25,
    rootDepthMinM: 0.3,
    rootDepthMaxM: 1.2,
    depletionFractionP: 0.5,
    yieldResponseKy: 0.85,
    optimalTempMinC: 18,
    optimalTempMaxC: 30,
    droughtTolerance: "Moderate",
    salinityToleranceDsm: 5.0,
  },
  {
    code: "cotton",
    name: "Cotton",
    scientificName: "Gossypium hirsutum",
    category: "Fiber",
    kcIni: 0.35,
    kcMid: 1.2,
    kcEnd: 0.6,
    stageIniDays: 30,
    stageDevDays: 50,
    stageMidDays: 60,
    stageLateDays: 55,
    rootDepthMinM: 0.4,
    rootDepthMaxM: 1.5,
    depletionFractionP: 0.65,
    yieldResponseKy: 0.85,
    optimalTempMinC: 20,
    optimalTempMaxC: 35,
    droughtTolerance: "High",
    salinityToleranceDsm: 7.7,
  },
  {
    code: "rice",
    name: "Paddy Rice",
    scientificName: "Oryza sativa",
    category: "Cereal",
    kcIni: 1.05,
    kcMid: 1.2,
    kcEnd: 0.85,
    stageIniDays: 30,
    stageDevDays: 30,
    stageMidDays: 60,
    stageLateDays: 30,
    rootDepthMinM: 0.2,
    rootDepthMaxM: 0.5,
    depletionFractionP: 0.2,
    yieldResponseKy: 1.2,
    optimalTempMinC: 20,
    optimalTempMaxC: 34,
    droughtTolerance: "Low",
    salinityToleranceDsm: 3.0,
  },
  {
    code: "date_palm",
    name: "Dates (Date Palm)",
    scientificName: "Phoenix dactylifera",
    category: "Perennial Orchard",
    kcIni: 0.9,
    kcMid: 0.95,
    kcEnd: 0.9,
    stageIniDays: 90,
    stageDevDays: 90,
    stageMidDays: 95,
    stageLateDays: 90,
    rootDepthMinM: 1.5,
    rootDepthMaxM: 2.5,
    depletionFractionP: 0.5,
    yieldResponseKy: 0.8,
    optimalTempMinC: 20,
    optimalTempMaxC: 42,
    droughtTolerance: "High",
    salinityToleranceDsm: 4.0,
    growingSeason: "Perennial (Oasis)",
    waterSensitivity: "Low",
  },
  {
    code: "barley",
    name: "Barley",
    scientificName: "Hordeum vulgare",
    category: "Cereal",
    kcIni: 0.3,
    kcMid: 1.15,
    kcEnd: 0.25,
    stageIniDays: 20,
    stageDevDays: 35,
    stageMidDays: 60,
    stageLateDays: 35,
    rootDepthMinM: 0.3,
    rootDepthMaxM: 1.5,
    depletionFractionP: 0.55,
    yieldResponseKy: 1.0,
    optimalTempMinC: 10,
    optimalTempMaxC: 24,
    droughtTolerance: "High",
    salinityToleranceDsm: 8.0,
    growingSeason: "Nov – May",
    waterSensitivity: "Low",
  },
  {
    code: "onion",
    name: "Onion",
    scientificName: "Allium cepa",
    category: "Horticulture",
    kcIni: 0.7,
    kcMid: 1.05,
    kcEnd: 0.75,
    stageIniDays: 20,
    stageDevDays: 35,
    stageMidDays: 70,
    stageLateDays: 45,
    rootDepthMinM: 0.2,
    rootDepthMaxM: 0.5,
    depletionFractionP: 0.3,
    yieldResponseKy: 1.1,
    optimalTempMinC: 13,
    optimalTempMaxC: 27,
    droughtTolerance: "Low",
    salinityToleranceDsm: 1.2,
    growingSeason: "Oct – Jun / Spring",
    waterSensitivity: "High",
  },
  {
    code: "pepper",
    name: "Pepper",
    scientificName: "Capsicum annuum",
    category: "Horticulture",
    kcIni: 0.6,
    kcMid: 1.05,
    kcEnd: 0.9,
    stageIniDays: 30,
    stageDevDays: 35,
    stageMidDays: 40,
    stageLateDays: 20,
    rootDepthMinM: 0.3,
    rootDepthMaxM: 0.8,
    depletionFractionP: 0.3,
    yieldResponseKy: 1.1,
    optimalTempMinC: 18,
    optimalTempMaxC: 30,
    droughtTolerance: "Low",
    salinityToleranceDsm: 1.5,
    growingSeason: "Mar – Sep",
    waterSensitivity: "High",
  },
  {
    code: "watermelon",
    name: "Watermelon",
    scientificName: "Citrullus lanatus",
    category: "Cucurbit",
    kcIni: 0.4,
    kcMid: 1.0,
    kcEnd: 0.75,
    stageIniDays: 20,
    stageDevDays: 30,
    stageMidDays: 30,
    stageLateDays: 30,
    rootDepthMinM: 0.4,
    rootDepthMaxM: 1.2,
    depletionFractionP: 0.4,
    yieldResponseKy: 1.1,
    optimalTempMinC: 20,
    optimalTempMaxC: 35,
    droughtTolerance: "Moderate",
    salinityToleranceDsm: 2.0,
    growingSeason: "Mar – Aug",
    waterSensitivity: "Moderate",
  },
  {
    code: "melon",
    name: "Melon",
    scientificName: "Cucumis melo",
    category: "Cucurbit",
    kcIni: 0.5,
    kcMid: 1.05,
    kcEnd: 0.75,
    stageIniDays: 25,
    stageDevDays: 35,
    stageMidDays: 40,
    stageLateDays: 20,
    rootDepthMinM: 0.4,
    rootDepthMaxM: 1.1,
    depletionFractionP: 0.45,
    yieldResponseKy: 1.05,
    optimalTempMinC: 20,
    optimalTempMaxC: 34,
    droughtTolerance: "Moderate",
    salinityToleranceDsm: 2.2,
    growingSeason: "Mar – Aug",
    waterSensitivity: "Moderate",
  },
  {
    code: "grapes",
    name: "Grapes (Vineyard)",
    scientificName: "Vitis vinifera",
    category: "Perennial Orchard",
    kcIni: 0.3,
    kcMid: 0.85,
    kcEnd: 0.45,
    stageIniDays: 30,
    stageDevDays: 60,
    stageMidDays: 90,
    stageLateDays: 60,
    rootDepthMinM: 0.8,
    rootDepthMaxM: 1.8,
    depletionFractionP: 0.45,
    yieldResponseKy: 0.85,
    optimalTempMinC: 15,
    optimalTempMaxC: 33,
    droughtTolerance: "High",
    salinityToleranceDsm: 1.5,
    growingSeason: "Mar – Oct",
    waterSensitivity: "Low",
  },
  {
    code: "almond",
    name: "Almond",
    scientificName: "Prunus dulcis",
    category: "Perennial Orchard",
    kcIni: 0.4,
    kcMid: 0.9,
    kcEnd: 0.65,
    stageIniDays: 40,
    stageDevDays: 60,
    stageMidDays: 100,
    stageLateDays: 60,
    rootDepthMinM: 0.9,
    rootDepthMaxM: 1.8,
    depletionFractionP: 0.5,
    yieldResponseKy: 0.9,
    optimalTempMinC: 14,
    optimalTempMaxC: 33,
    droughtTolerance: "High",
    salinityToleranceDsm: 1.5,
    growingSeason: "Feb – Sep",
    waterSensitivity: "Moderate",
  },
  {
    code: "custom",
    name: "Other / Custom Crop",
    scientificName: "Species unspecified",
    category: "Custom",
    kcIni: 0.5,
    kcMid: 1.0,
    kcEnd: 0.7,
    stageIniDays: 30,
    stageDevDays: 40,
    stageMidDays: 50,
    stageLateDays: 30,
    rootDepthMinM: 0.3,
    rootDepthMaxM: 1.0,
    depletionFractionP: 0.45,
    yieldResponseKy: 1.0,
    optimalTempMinC: 15,
    optimalTempMaxC: 32,
    droughtTolerance: "Moderate",
    salinityToleranceDsm: 2.0,
    growingSeason: "Variable",
    waterSensitivity: "Moderate",
  },
];

export function getCropSpec(cropCode: string): CropSpec {
  const normalized = cropCode === "dates" ? "date_palm" : cropCode;
  return CROP_DATABASE.find((c) => c.code === normalized) ?? CROP_DATABASE[0];
}

export interface PenmanMonteithInput {
  tempMinC: number;
  tempMaxC: number;
  relativeHumidityPct: number;
  windSpeed10mKmh: number;
  solarRadiationMjM2Day: number;
  latitudeDeg: number;
  elevationM: number;
  dayOfYear: number;
}

/**
 * Full FAO-56 Penman-Monteith Reference Evapotranspiration (mm/day).
 */
export function calculatePenmanMonteithET0(input: PenmanMonteithInput): number {
  const tMean = (input.tempMinC + input.tempMaxC) / 2;
  const u10Ms = Math.max(0.2, input.windSpeed10mKmh / 3.6);
  // Convert 10m wind speed to 2m height per FAO-56 Eq. 47
  const u2 = u10Ms * (4.87 / Math.log(67.8 * 10 - 5.42));

  // Atmospheric pressure (kPa) and psychrometric constant (kPa/C)
  const P = 101.3 * Math.pow((293 - 0.0065 * input.elevationM) / 293, 5.26);
  const gamma = 0.000665 * P;

  // Saturation & actual vapor pressure (kPa)
  const eTmin = 0.6108 * Math.exp((17.27 * input.tempMinC) / (input.tempMinC + 237.3));
  const eTmax = 0.6108 * Math.exp((17.27 * input.tempMaxC) / (input.tempMaxC + 237.3));
  const es = (eTmin + eTmax) / 2;
  const ea = es * (Math.min(100, Math.max(5, input.relativeHumidityPct)) / 100);

  // Slope of saturation vapor pressure curve (kPa/C)
  const delta =
    (4098 * (0.6108 * Math.exp((17.27 * tMean) / (tMean + 237.3)))) /
    Math.pow(tMean + 237.3, 2);

  // Extraterrestrial radiation Ra
  const phi = (Math.PI / 180) * input.latitudeDeg;
  const dr = 1 + 0.033 * Math.cos(((2 * Math.PI) / 365) * input.dayOfYear);
  const decl = 0.409 * Math.sin(((2 * Math.PI) / 365) * input.dayOfYear - 1.39);
  const wsArg = Math.min(1, Math.max(-1, -Math.tan(phi) * Math.tan(decl)));
  const ws = Math.acos(wsArg);
  const ra =
    ((24 * 60) / Math.PI) *
    0.082 *
    dr *
    (ws * Math.sin(phi) * Math.sin(decl) + Math.cos(phi) * Math.cos(decl) * Math.sin(ws));

  const rso = (0.75 + 2e-5 * input.elevationM) * ra;
  const rs = Math.max(1, input.solarRadiationMjM2Day);
  const rns = (1 - 0.23) * rs;
  const rsRatio = Math.min(1, Math.max(0.25, rs / Math.max(0.1, rso)));

  const tMinK4 = Math.pow(input.tempMinC + 273.16, 4);
  const tMaxK4 = Math.pow(input.tempMaxC + 273.16, 4);
  const rnl =
    4.903e-9 *
    ((tMaxK4 + tMinK4) / 2) *
    (0.34 - 0.14 * Math.sqrt(Math.max(0.05, ea))) *
    (1.35 * rsRatio - 0.35);

  const rn = rns - rnl;
  const G = 0; // Daily soil heat flux ≈ 0

  const numerator =
    0.408 * delta * (rn - G) + gamma * (900 / (tMean + 273)) * u2 * Math.max(0, es - ea);
  const denominator = delta + gamma * (1 + 0.34 * u2);
  const et0 = Math.max(0.1, numerator / denominator);

  return Number(et0.toFixed(2));
}

/**
 * USDA-SCS / FAO Effective Rainfall approximation for monthly precipitation (mm/month).
 */
export function calculateEffectiveRainfallMm(monthlyPrecipMm: number): number {
  if (monthlyPrecipMm <= 0) return 0;
  if (monthlyPrecipMm <= 250) {
    return Number(((monthlyPrecipMm * (125 - 0.2 * monthlyPrecipMm)) / 125).toFixed(1));
  }
  return Number((125 + 0.1 * monthlyPrecipMm).toFixed(1));
}

function getMonthlyKcForCrop(crop: CropSpec, monthIndex: number, plantingMonth: number): number {
  const totalDays = crop.stageIniDays + crop.stageDevDays + crop.stageMidDays + crop.stageLateDays;
  const isPerennial = totalDays >= 360;

  if (isPerennial) {
    // Perennial crops stay active year-round; scale slightly by warm vs dormant season
    const offset = ((monthIndex - plantingMonth + 12) % 12) * 30.4;
    if (offset < crop.stageIniDays) return crop.kcIni;
    if (offset < crop.stageIniDays + crop.stageDevDays) {
      const f = (offset - crop.stageIniDays) / crop.stageDevDays;
      return crop.kcIni + f * (crop.kcMid - crop.kcIni);
    }
    if (offset < crop.stageIniDays + crop.stageDevDays + crop.stageMidDays) return crop.kcMid;
    const f =
      (offset - (crop.stageIniDays + crop.stageDevDays + crop.stageMidDays)) /
      Math.max(1, crop.stageLateDays);
    return crop.kcMid + f * (crop.kcEnd - crop.kcMid);
  }

  const monthsSincePlanting = (monthIndex - plantingMonth + 12) % 12;
  const dayOfCycle = monthsSincePlanting * 30.4 + 15;
  if (dayOfCycle > totalDays) {
    return 0.15; // Bare soil / fallow evaporation outside growing cycle
  }
  if (dayOfCycle <= crop.stageIniDays) return crop.kcIni;
  if (dayOfCycle <= crop.stageIniDays + crop.stageDevDays) {
    const f = (dayOfCycle - crop.stageIniDays) / crop.stageDevDays;
    return crop.kcIni + f * (crop.kcMid - crop.kcIni);
  }
  if (dayOfCycle <= crop.stageIniDays + crop.stageDevDays + crop.stageMidDays) {
    return crop.kcMid;
  }
  const f =
    (dayOfCycle - (crop.stageIniDays + crop.stageDevDays + crop.stageMidDays)) /
    Math.max(1, crop.stageLateDays);
  return crop.kcMid + f * (crop.kcEnd - crop.kcMid);
}

const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

export function calculateCropWaterRequirements(params: {
  cropCode: string;
  irrigatedAreaHa: number;
  irrigationMethod: IrrigationMethod;
  plantingMonth: number;
  monthlyClimate: MonthlyClimateSummary[];
  soilProfile?: SoilProfileData;
  pumpFlowRateM3Hr?: number;
}): CropWaterRequirementResult {
  const crop = getCropSpec(params.cropCode);
  const irrigatedAreaHa = Math.max(0.05, params.irrigatedAreaHa);
  const effMeta = IRRIGATION_EFFICIENCY_DEFAULTS[params.irrigationMethod] ?? IRRIGATION_EFFICIENCY_DEFAULTS.DRIP;
  const applicationEfficiency = effMeta.efficiencyPct / 100;
  const soil = params.soilProfile ?? {
    ...SOIL_TEXTURE_DEFAULTS.LOAM,
    source: "Default Loam Baseline (Soil survey missing)",
    updatedAt: new Date().toISOString(),
  };

  const missingDataWarnings: string[] = [];
  if (!params.soilProfile || params.soilProfile.source.toLowerCase().includes("default")) {
    missingDataWarnings.push(
      "Site-specific laboratory soil water retention measurements are missing; using standard FAO soil texture class defaults."
    );
  }
  missingDataWarnings.push(
    `Irrigation application efficiency (${effMeta.efficiencyPct}% for ${effMeta.label}) assumes well-maintained emitters and uniform scheduling.`
  );

  const flowM3Hr = Math.max(1, params.pumpFlowRateM3Hr ?? 20);
  const monthly: MonthlyIrrigationDemand[] = params.monthlyClimate.map((m) => {
    const kc = Number(getMonthlyKcForCrop(crop, m.monthIndex, params.plantingMonth).toFixed(2));
    const etcMm = Number((kc * m.et0SumMm).toFixed(1));
    const effectiveRainMm = calculateEffectiveRainfallMm(m.precipSumMm);
    const netIrrigationMm = Number(Math.max(0, etcMm - effectiveRainMm).toFixed(1));
    const grossIrrigationMm = Number((netIrrigationMm / applicationEfficiency).toFixed(1));
    // 1 mm over 1 hectare = 10 m³
    const grossVolumeM3 = Number((grossIrrigationMm * irrigatedAreaHa * 10).toFixed(0));
    const days = DAYS_IN_MONTH[m.monthIndex - 1] ?? 30;
    const dailyPeakM3 = Number((grossVolumeM3 / days).toFixed(1));
    const requiredPumpHoursPerDay = Number(Math.min(24, dailyPeakM3 / flowM3Hr).toFixed(2));

    return {
      monthIndex: m.monthIndex,
      monthName: m.monthName,
      et0Mm: Number(m.et0SumMm.toFixed(1)),
      kc,
      etcMm,
      precipMm: Number(m.precipSumMm.toFixed(1)),
      effectiveRainMm,
      netIrrigationMm,
      grossIrrigationMm,
      grossVolumeM3,
      dailyPeakM3,
      requiredPumpHoursPerDay,
    };
  });

  const annualEt0Mm = Number(monthly.reduce((s, m) => s + m.et0Mm, 0).toFixed(1));
  const annualEtcMm = Number(monthly.reduce((s, m) => s + m.etcMm, 0).toFixed(1));
  const annualEffectiveRainMm = Number(
    monthly.reduce((s, m) => s + m.effectiveRainMm, 0).toFixed(1)
  );
  const annualNetIrrigationMm = Number(
    monthly.reduce((s, m) => s + m.netIrrigationMm, 0).toFixed(1)
  );
  const annualGrossIrrigationMm = Number(
    monthly.reduce((s, m) => s + m.grossIrrigationMm, 0).toFixed(1)
  );
  const annualGrossVolumeM3 = Number(
    monthly.reduce((s, m) => s + m.grossVolumeM3, 0).toFixed(0)
  );

  const peakMonth = monthly.reduce((best, cur) =>
    cur.dailyPeakM3 > best.dailyPeakM3 ? cur : best
  );

  // Root-zone soil water balance (TAW and RAW in mm)
  const totalAvailableWaterMm = Number((soil.tawMmM * crop.rootDepthMaxM).toFixed(1));
  const readilyAvailableWaterMm = Number(
    (totalAvailableWaterMm * crop.depletionFractionP).toFixed(1)
  );
  const peakDailyEtcMm = peakMonth.etcMm / (DAYS_IN_MONTH[peakMonth.monthIndex - 1] ?? 30);
  const peakIrrigationIntervalDays =
    peakDailyEtcMm > 0
      ? Number(Math.max(1, Math.min(21, readilyAvailableWaterMm / peakDailyEtcMm)).toFixed(1))
      : 14;

  return {
    crop,
    irrigatedAreaHa,
    irrigationMethod: params.irrigationMethod,
    applicationEfficiencyPct: effMeta.efficiencyPct,
    plantingMonth: params.plantingMonth,
    annualEt0Mm,
    annualEtcMm,
    annualEffectiveRainMm,
    annualNetIrrigationMm,
    annualGrossIrrigationMm,
    annualGrossVolumeM3,
    peakMonthName: peakMonth.monthName,
    peakDailyWaterM3: peakMonth.dailyPeakM3,
    totalAvailableWaterMm,
    readilyAvailableWaterMm,
    peakIrrigationIntervalDays,
    monthly,
    missingDataWarnings,
    methodology:
      "FAO-56 Crop Evapotranspiration (ETc = Kc × ETo) & Root-Zone Soil Water Balance (PI-Advisor computational adaptation)",
  };
}

export function rankCropSuitability(
  monthlyClimate: MonthlyClimateSummary[],
  plantingMonth = 3
): CropSuitabilityScore[] {
  const annualMeanTemp =
    monthlyClimate.reduce((s, m) => s + m.tempMeanAvgC, 0) / Math.max(1, monthlyClimate.length);
  const summerMaxAvg = Math.max(...monthlyClimate.map((m) => m.tempMaxAvgC));
  const winterMinAvg = Math.min(...monthlyClimate.map((m) => m.tempMinAvgC));

  return CROP_DATABASE.filter((c) => c.code !== "custom").map((crop) => {
    const req = calculateCropWaterRequirements({
      cropCode: crop.code,
      irrigatedAreaHa: 1,
      irrigationMethod: "DRIP",
      plantingMonth,
      monthlyClimate,
    });

    // Thermal compatibility score (0..60)
    let thermalScore = 60;
    let thermalMatchNote = `Mean temperature (${annualMeanTemp.toFixed(1)}°C) fits optimal range (${crop.optimalTempMinC}–${crop.optimalTempMaxC}°C).`;
    if (summerMaxAvg > crop.optimalTempMaxC + 6) {
      thermalScore -= 18;
      thermalMatchNote = `Peak summer highs (${summerMaxAvg.toFixed(1)}°C) exceed optimal ceiling (${crop.optimalTempMaxC}°C); heat stress risk.`;
    } else if (winterMinAvg < 2 && crop.category === "Perennial Orchard" && crop.code === "citrus") {
      thermalScore -= 22;
      thermalMatchNote = `Winter frost exposure (${winterMinAvg.toFixed(1)}°C avg min) creates cold damage risk for ${crop.name}.`;
    } else if (annualMeanTemp < crop.optimalTempMinC - 2) {
      thermalScore -= 15;
      thermalMatchNote = `Cool mean climate (${annualMeanTemp.toFixed(1)}°C) slows crop development below ${crop.optimalTempMinC}°C.`;
    }

    // Water efficiency score (0..40)
    const m3PerHa = req.annualGrossVolumeM3;
    let waterScore = 40;
    if (m3PerHa > 11000) waterScore = 16;
    else if (m3PerHa > 7500) waterScore = 24;
    else if (m3PerHa > 4500) waterScore = 32;

    if (crop.droughtTolerance === "High") waterScore = Math.min(40, waterScore + 6);

    const totalScore = Math.max(25, Math.min(98, Math.round(thermalScore + waterScore)));
    const rating: "HIGH" | "MODERATE" | "LOW" =
      totalScore >= 75 ? "HIGH" : totalScore >= 55 ? "MODERATE" : "LOW";

    return {
      cropCode: crop.code,
      cropName: crop.name,
      category: crop.category,
      score: totalScore,
      rating,
      estimatedAnnualIrrigationM3Ha: Math.round(m3PerHa),
      thermalMatchNote,
      waterDemandNote: `Estimated ${Math.round(m3PerHa).toLocaleString()} m³/ha/yr under 90% drip efficiency (${crop.droughtTolerance} drought tolerance).`,
    };
  }).sort((a, b) => b.score - a.score);
}

/**
 * Computes area-weighted FAO-56 irrigation requirements across multiple crops on a single farm.
 */
export function calculateMultiCropWaterRequirements(params: {
  farmCrops: FarmCropRecord[];
  monthlyClimate: MonthlyClimateSummary[];
  soilProfile?: SoilProfileData;
  pumpFlowRateM3Hr?: number;
}): CropWaterRequirementResult | null {
  if (!params.farmCrops || params.farmCrops.length === 0) return null;

  const perCropResults = params.farmCrops.map((fc) => {
    const plantingMonth =
      fc.plantingDate && /^\d{4}-\d{2}/.test(fc.plantingDate)
        ? Math.min(12, Math.max(1, Number(fc.plantingDate.slice(5, 7))))
        : 3;
    return calculateCropWaterRequirements({
      cropCode: fc.cropCode,
      irrigatedAreaHa: Math.max(0.01, fc.cultivatedAreaHa),
      irrigationMethod: fc.irrigationMethod,
      plantingMonth,
      monthlyClimate: params.monthlyClimate,
      soilProfile: params.soilProfile,
      pumpFlowRateM3Hr: params.pumpFlowRateM3Hr,
    });
  });

  if (perCropResults.length === 1) return perCropResults[0];

  const totalAreaHa = perCropResults.reduce((s, r) => s + r.irrigatedAreaHa, 0);
  const flowM3Hr = Math.max(1, params.pumpFlowRateM3Hr ?? 20);

  const monthly: MonthlyIrrigationDemand[] = perCropResults[0].monthly.map((m, idx) => {
    const grossVolumeM3 = perCropResults.reduce(
      (s, r) => s + (r.monthly[idx]?.grossVolumeM3 ?? 0),
      0
    );
    const weightedEtcMm =
      perCropResults.reduce(
        (s, r) => s + (r.monthly[idx]?.etcMm ?? 0) * r.irrigatedAreaHa,
        0
      ) / Math.max(0.01, totalAreaHa);
    const weightedNetMm =
      perCropResults.reduce(
        (s, r) => s + (r.monthly[idx]?.netIrrigationMm ?? 0) * r.irrigatedAreaHa,
        0
      ) / Math.max(0.01, totalAreaHa);
    const weightedGrossMm =
      perCropResults.reduce(
        (s, r) => s + (r.monthly[idx]?.grossIrrigationMm ?? 0) * r.irrigatedAreaHa,
        0
      ) / Math.max(0.01, totalAreaHa);
    const days = DAYS_IN_MONTH[m.monthIndex - 1] ?? 30;
    const dailyPeakM3 = Number((grossVolumeM3 / days).toFixed(1));
    return {
      monthIndex: m.monthIndex,
      monthName: m.monthName,
      et0Mm: m.et0Mm,
      kc: Number((weightedEtcMm / Math.max(1, m.et0Mm)).toFixed(2)),
      etcMm: Number(weightedEtcMm.toFixed(1)),
      precipMm: m.precipMm,
      effectiveRainMm: m.effectiveRainMm,
      netIrrigationMm: Number(weightedNetMm.toFixed(1)),
      grossIrrigationMm: Number(weightedGrossMm.toFixed(1)),
      grossVolumeM3: Number(grossVolumeM3.toFixed(0)),
      dailyPeakM3,
      requiredPumpHoursPerDay: Number(Math.min(24, dailyPeakM3 / flowM3Hr).toFixed(2)),
    };
  });

  const peakMonth = monthly.reduce((best, cur) =>
    cur.dailyPeakM3 > best.dailyPeakM3 ? cur : best
  );

  return {
    ...perCropResults[0],
    irrigatedAreaHa: Number(totalAreaHa.toFixed(2)),
    annualEtcMm: Number(monthly.reduce((s, m) => s + m.etcMm, 0).toFixed(1)),
    annualNetIrrigationMm: Number(monthly.reduce((s, m) => s + m.netIrrigationMm, 0).toFixed(1)),
    annualGrossIrrigationMm: Number(monthly.reduce((s, m) => s + m.grossIrrigationMm, 0).toFixed(1)),
    annualGrossVolumeM3: Number(monthly.reduce((s, m) => s + m.grossVolumeM3, 0).toFixed(0)),
    peakMonthName: peakMonth.monthName,
    peakDailyWaterM3: peakMonth.dailyPeakM3,
    monthly,
    methodology:
      "Multi-Crop Area-Weighted FAO-56 Crop Evapotranspiration & Soil Water Balance",
  };
}
