import { getCropSpec } from "@/lib/engines/fao56-calculator";
import { fullEnglishMonthName } from "@/lib/i18n/translations";
import type {
  CompleteFarmAnalysisBundle,
  FarmRecord,
  SensorReadingRecord,
  WaterSourceFeature,
} from "@/types/agri";

/** UNKNOWN = not checked yet (no live analysis), so the app never shows a guess as a fact. */
export type FarmerStatusLevel = "GOOD" | "OK" | "PROBLEM" | "UNKNOWN";

export interface FarmerWaterSourceRow {
  id: string;
  name: string;
  sourceType: WaterSourceFeature["sourceType"];
  distanceM: number;
  cardinalDirection: string;
  elevationDiffM: number | null;
  heightCategory: "SAME" | "HIGHER" | "LOWER" | "UNKNOWN";
  heightAbsM: number | null;
  actionType: "GO_AND_CHECK" | "ASK_PERMISSION";
}

export interface FarmerMetricsSnapshot {
  hasAnalysis: boolean;
  farmId: string;
  farmName: string;
  areaHectares: number;
  cropName: string;
  cropCode: string;

  // Water & pump
  pumpFlowM3Hr: number;
  pumpHoursDay: number;
  pumpDailySupplyM3: number;
  peakDailyDemandM3: number | null;
  /** null until the analysis has run: never guess a month */
  peakMonthName: string | null;
  waterCoveragePct: number | null;
  waterDeficitRatio: number;
  cupsDenominator: number;
  isWaterShort: boolean;
  neededPumpFlowM3Hr: number | null;
  neededPumpHoursDay: number | null;
  waterStatus: FarmerStatusLevel;
  sourcesCount: number;
  nearestSourceDistanceM: number | null;
  nearestSourceName: string | null;
  topWaterSources: FarmerWaterSourceRow[];

  // Sun power
  solarKwp: number;
  solarPanelCount500W: number;
  solarAnnualKwh: number | null;
  pumpAnnualKwh: number | null;
  annualSolarCoversPump: boolean;
  worstMonthName: string | null;
  worstMonthCoveragePct: number | null;
  solarUnitsOutOf10: number;
  worstMonthDeficitKwh: number;
  isSolarShortInSummer: boolean;
  sunStatus: FarmerStatusLevel;
  recommendedTankM3: number | null;
  recommendedBatteryKwh: number | null;
  recommendedPanelsPeak500W: number | null;

  // Weather & land
  currentTempC: number | null;
  todayMaxTempC: number | null;
  weatherSummary: string | null;
  todayPrecipMm: number;
  /** Water the soil loses today (mm); null when the forecast has no value */
  todayEt0Mm: number | null;
  shouldWaterToday: boolean;
  hasFrostAlert: boolean;
  hasHeatAlert: boolean;
  hasWindAlert: boolean;
  hasAnyWeatherAlert: boolean;
  weatherStatus: FarmerStatusLevel;
  annualPrecipMm: number | null;
  summerPrecipMm: number | null;
  elevationM: number | null;
  slopePct: number | null;
  landStatus: FarmerStatusLevel;

  // Headline problem priority
  primaryProblem: "WATER_SHORT" | "NO_WATER_SOURCE" | "WEATHER_ALERT" | "SOLAR_SHORT" | "NONE";
  isRainfedCrop: boolean;

  // Live field sensor integration (ESP32 node)
  sensorReading: SensorReadingRecord | null;
  isSensorFresh: boolean;
  isSensorStale: boolean;
  hasSensorFault: boolean;
  tempSource: "SENSOR" | "FORECAST";
  tempSourceLabel: "from your sensor" | "from the forecast";
  waterAdviceSource: "SENSOR" | "FORECAST";
  waterAdviceSourceLabel: "from your sensor" | "from the forecast";
  liveSoilMoisturePct: number | null;
  liveAirHumidityPct: number | null;
  liveWaterLevelPct: number | null;
  livePumpOn: boolean | null;
}

export const SENSOR_STALE_AFTER_MS = 15 * 60 * 1000;
export const SOIL_DRY_THRESHOLD_PCT = 45;

function mapSourceRow(s: WaterSourceFeature): FarmerWaterSourceRow {
  const diff = s.elevationDiffFromFarmM;
  let heightCategory: FarmerWaterSourceRow["heightCategory"] = "UNKNOWN";
  let heightAbsM: number | null = null;
  if (diff !== null && Number.isFinite(diff)) {
    heightAbsM = Math.round(Math.abs(diff));
    if (heightAbsM <= 10) heightCategory = "SAME";
    else if (diff < 0) heightCategory = "LOWER";
    else heightCategory = "HIGHER";
  }

  const lowerName = s.name.toLowerCase();
  const actionType =
    s.sourceType === "RESERVOIR" ||
    lowerName.includes("dam") ||
    lowerName.includes("barrage")
      ? "ASK_PERMISSION"
      : "GO_AND_CHECK";

  return {
    id: s.id,
    name: s.name,
    sourceType: s.sourceType,
    distanceM: Math.round(s.distanceFromBoundaryM),
    cardinalDirection: s.cardinalDirection,
    elevationDiffM: diff,
    heightCategory,
    heightAbsM,
    actionType,
  };
}

export function selectFarmerMetrics(
  farm: FarmRecord,
  analysis?: CompleteFarmAnalysisBundle | null,
  latestSensorReading?: SensorReadingRecord | null,
  nowMs: number = Date.now()
): FarmerMetricsSnapshot {
  const cropSpec = getCropSpec(farm.irrigationConfig.cropCode);
  const isRainfedCrop = farm.irrigationConfig.irrigationMethod === "NONE";

  const pumpFlowM3Hr = farm.pumpConfig.flowRateM3Hr;
  const pumpHoursDay = farm.pumpConfig.operatingHoursDay;
  const pumpDailySupplyM3 = Math.round(pumpFlowM3Hr * pumpHoursDay);

  const peakDailyDemandM3 = analysis
    ? Math.round(analysis.irrigation.peakDailyWaterM3)
    : null;
  const peakMonthName = analysis ? fullEnglishMonthName(analysis.irrigation.peakMonthName) : null;

  const rawWaterRatio =
    peakDailyDemandM3 && peakDailyDemandM3 > 0
      ? pumpDailySupplyM3 / peakDailyDemandM3
      : 1;
  const waterCoveragePct =
    peakDailyDemandM3 && peakDailyDemandM3 > 0
      ? Math.min(100, Math.round(rawWaterRatio * 100))
      : null;
  const waterDeficitRatio =
    peakDailyDemandM3 && peakDailyDemandM3 > 0 && pumpDailySupplyM3 < peakDailyDemandM3
      ? (peakDailyDemandM3 - pumpDailySupplyM3) / peakDailyDemandM3
      : 0;
  const cupsDenominator =
    peakDailyDemandM3 && pumpDailySupplyM3 > 0
      ? Math.max(1, Math.round(peakDailyDemandM3 / pumpDailySupplyM3))
      : 1;

  const isWaterShort =
    !isRainfedCrop &&
    peakDailyDemandM3 !== null &&
    peakDailyDemandM3 > 0 &&
    pumpDailySupplyM3 < peakDailyDemandM3 * 0.95;

  const neededPumpFlowM3Hr =
    peakDailyDemandM3 !== null && peakDailyDemandM3 > 0
      ? Math.ceil(peakDailyDemandM3 / Math.max(1, pumpHoursDay))
      : null;
  const neededPumpHoursDay =
    peakDailyDemandM3 !== null && peakDailyDemandM3 > 0
      ? Math.round(peakDailyDemandM3 / Math.max(0.5, pumpFlowM3Hr))
      : null;

  const topWaterSources = (analysis?.waterSources.sources ?? [])
    .slice(0, 3)
    .map(mapSourceRow);
  const nearest = analysis?.waterSources.nearestSource ?? null;

  const solarKwp = farm.solarConfig.capacityKwp;
  const solarPanelCount500W =
    farm.solarConfig.panelCount ?? Math.max(1, Math.round((solarKwp * 1000) / 500));
  const solarAnnualKwh = analysis ? Math.round(analysis.solar.annualKwh) : null;
  const pumpAnnualKwh = analysis
    ? Math.round(analysis.solarVsPump.annualPumpKwh)
    : null;
  const annualSolarCoversPump =
    solarAnnualKwh !== null &&
    pumpAnnualKwh !== null &&
    solarAnnualKwh >= pumpAnnualKwh;
  const worstMonthName = analysis ? fullEnglishMonthName(analysis.solarVsPump.worstMonthName) : null;
  const worstMonthCoveragePct = analysis
    ? Math.round(analysis.solarVsPump.worstMonthCoveragePct)
    : null;
  const solarUnitsOutOf10 =
    worstMonthCoveragePct !== null
      ? Math.max(0, Math.min(10, Math.round(worstMonthCoveragePct / 10)))
      : 0;
  const worstMonthDeficitKwh = analysis
    ? Math.round(analysis.solarVsPump.worstMonthDeficitKwh)
    : 0;
  const isSolarShortInSummer =
    worstMonthCoveragePct !== null && worstMonthCoveragePct < 95;

  const recommendedPanelsPeak500W =
    worstMonthCoveragePct !== null && worstMonthCoveragePct > 5
      ? Math.ceil(solarPanelCount500W / (worstMonthCoveragePct / 100))
      : null;

  const waterStatus: FarmerStatusLevel = !analysis
    ? "UNKNOWN"
    : isWaterShort || !nearest
      ? "PROBLEM"
      : "GOOD";
  const sunStatus: FarmerStatusLevel = !analysis
    ? "UNKNOWN"
    : worstMonthCoveragePct !== null && worstMonthCoveragePct < 40
      ? "PROBLEM"
      : isSolarShortInSummer
        ? "OK"
        : "GOOD";

  const today = analysis?.weather.daily[0];
  const hasFrostAlert = Boolean(
    analysis?.weather.alerts.some((a) => a.type === "FROST") ||
      analysis?.weather.daily.slice(0, 4).some((d) => d.tempMinC <= 2)
  );
  const hasHeatAlert = Boolean(
    analysis?.weather.alerts.some((a) => a.type === "HEAT_STRESS") ||
      analysis?.weather.daily.slice(0, 4).some((d) => d.tempMaxC >= 37)
  );
  const hasWindAlert = Boolean(
    analysis?.weather.alerts.some((a) => a.type === "HIGH_WIND") ||
      analysis?.weather.daily.slice(0, 4).some((d) => d.windSpeedMaxKmh >= 45)
  );
  const hasAnyWeatherAlert = hasFrostAlert || hasHeatAlert || hasWindAlert;
  const weatherStatus: FarmerStatusLevel = !analysis
    ? "UNKNOWN"
    : hasAnyWeatherAlert
      ? "PROBLEM"
      : "GOOD";

  const summerSeason = analysis?.climate.seasons.find(
    (s) => s.season === "Summer"
  );

  const elevationM = analysis
    ? Math.round(analysis.elevation.farmElevationM)
    : farm.elevationM !== null && farm.elevationM !== undefined
      ? Math.round(farm.elevationM)
      : null;
  const slopePct = analysis ? analysis.elevation.estimatedSlopePct : null;
  const landStatus: FarmerStatusLevel =
    slopePct === null ? "UNKNOWN" : slopePct > 8 ? "OK" : "GOOD";

  let primaryProblem: FarmerMetricsSnapshot["primaryProblem"] = "NONE";
  if (isWaterShort) primaryProblem = "WATER_SHORT";
  else if (analysis && !nearest && !isRainfedCrop)
    primaryProblem = "NO_WATER_SOURCE";
  else if (hasAnyWeatherAlert) primaryProblem = "WEATHER_ALERT";
  else if (isSolarShortInSummer && !isRainfedCrop)
    primaryProblem = "SOLAR_SHORT";

  const sensorTsMs = latestSensorReading
    ? new Date(latestSensorReading.recordedAt || latestSensorReading.receivedAt).getTime()
    : NaN;
  const isSensorFresh = Boolean(
    latestSensorReading &&
      Number.isFinite(sensorTsMs) &&
      nowMs - sensorTsMs < SENSOR_STALE_AFTER_MS
  );
  const isSensorStale = Boolean(latestSensorReading && !isSensorFresh);
  const hasSensorFault = Boolean(latestSensorReading?.soilFault);
  const canUseSensorSoil = Boolean(
    isSensorFresh &&
      latestSensorReading &&
      !latestSensorReading.soilFault &&
      latestSensorReading.soilMoisturePct !== null
  );
  const canUseSensorTemp = Boolean(
    isSensorFresh &&
      latestSensorReading &&
      latestSensorReading.airTempC !== null
  );

  const currentTempC = canUseSensorTemp
    ? Math.round(latestSensorReading!.airTempC!)
    : analysis
      ? Math.round(analysis.weather.current.temperatureC)
      : null;
  const tempSource: FarmerMetricsSnapshot["tempSource"] = canUseSensorTemp
    ? "SENSOR"
    : "FORECAST";
  const tempSourceLabel: FarmerMetricsSnapshot["tempSourceLabel"] = canUseSensorTemp
    ? "from your sensor"
    : "from the forecast";

  const shouldWaterToday = canUseSensorSoil
    ? latestSensorReading!.soilMoisturePct! < SOIL_DRY_THRESHOLD_PCT
    : (today?.precipMm ?? 0) < 5;
  const waterAdviceSource: FarmerMetricsSnapshot["waterAdviceSource"] = canUseSensorSoil
    ? "SENSOR"
    : "FORECAST";
  const waterAdviceSourceLabel: FarmerMetricsSnapshot["waterAdviceSourceLabel"] = canUseSensorSoil
    ? "from your sensor"
    : "from the forecast";

  return {
    hasAnalysis: Boolean(analysis),
    farmId: farm.id,
    farmName: farm.name,
    areaHectares: farm.areaHectares,
    cropName: cropSpec.name,
    cropCode: cropSpec.code,

    pumpFlowM3Hr,
    pumpHoursDay,
    pumpDailySupplyM3,
    peakDailyDemandM3,
    peakMonthName,
    waterCoveragePct,
    waterDeficitRatio,
    cupsDenominator,
    isWaterShort,
    neededPumpFlowM3Hr,
    neededPumpHoursDay,
    waterStatus,
    sourcesCount: analysis?.waterSources.sources.length ?? 0,
    nearestSourceDistanceM: nearest ? Math.round(nearest.distanceFromBoundaryM) : null,
    nearestSourceName: nearest?.name ?? null,
    topWaterSources,

    solarKwp,
    solarPanelCount500W,
    solarAnnualKwh,
    pumpAnnualKwh,
    annualSolarCoversPump,
    worstMonthName,
    worstMonthCoveragePct,
    solarUnitsOutOf10,
    worstMonthDeficitKwh,
    isSolarShortInSummer,
    sunStatus,
    recommendedTankM3: analysis
      ? Math.round(analysis.solarVsPump.recommendedWaterStorageTankM3)
      : null,
    recommendedBatteryKwh: analysis
      ? Math.round(analysis.solarVsPump.recommendedBatteryKwh)
      : null,
    recommendedPanelsPeak500W,

    currentTempC,
    todayMaxTempC: today ? Math.round(today.tempMaxC) : null,
    weatherSummary: analysis?.weather.current.weatherSummary ?? null,
    todayPrecipMm: today?.precipMm ?? 0,
    todayEt0Mm:
      today?.et0Mm !== null && today?.et0Mm !== undefined ? Math.round(today.et0Mm) : null,
    shouldWaterToday,
    hasFrostAlert,
    hasHeatAlert,
    hasWindAlert,
    hasAnyWeatherAlert,
    weatherStatus,
    annualPrecipMm: analysis ? Math.round(analysis.climate.annualPrecipMm) : null,
    summerPrecipMm: summerSeason ? Math.round(summerSeason.precipSumMm) : null,
    elevationM,
    slopePct,
    landStatus,

    primaryProblem,
    isRainfedCrop,

    sensorReading: latestSensorReading ?? null,
    isSensorFresh,
    isSensorStale,
    hasSensorFault,
    tempSource,
    tempSourceLabel,
    waterAdviceSource,
    waterAdviceSourceLabel,
    liveSoilMoisturePct:
      latestSensorReading && !latestSensorReading.soilFault
        ? latestSensorReading.soilMoisturePct
        : null,
    liveAirHumidityPct: latestSensorReading?.airHumidityPct ?? null,
    liveWaterLevelPct: latestSensorReading?.waterLevelPct ?? null,
    livePumpOn: latestSensorReading ? latestSensorReading.pumpOn : null,
  };
}
