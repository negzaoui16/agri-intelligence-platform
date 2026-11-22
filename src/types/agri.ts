export type DataProvenanceType = "OBSERVED" | "MODELED" | "ASSUMPTION";

export interface DataSourceCitation {
  id: string;
  name: string;
  provider: string;
  provenance: DataProvenanceType;
  retrievedAt: string;
  spatialResolution?: string;
  temporalResolution?: string;
  url?: string;
  limitations?: string;
}

export type PinRole =
  | "FIELD_CENTER"
  | "WELL_CANDIDATE"
  | "SOLAR_ARRAY"
  | "PUMP_INTAKE"
  | "SOIL_SAMPLE"
  | "CUSTOM";

export type SoilTextureClass =
  | "SANDY"
  | "SANDY_LOAM"
  | "LOAM"
  | "SILT_LOAM"
  | "CLAY_LOAM"
  | "CLAY";

export type IrrigationMethod =
  | "DRIP"
  | "SUBSURFACE_DRIP"
  | "SPRINKLER"
  | "CENTER_PIVOT"
  | "FURROW"
  | "MANUAL"
  | "NONE"
  | "OTHER";

export type FarmerExperienceLevel =
  | "BEGINNER"
  | "LESS_THAN_2_YEARS"
  | "YEARS_2_5"
  | "YEARS_5_10"
  | "MORE_THAN_10_YEARS";

export type FarmerActivityType =
  | "SMALL_FAMILY_FARM"
  | "COMMERCIAL_AGRICULTURE"
  | "AGRICULTURAL_COOPERATIVE"
  | "AGRICULTURAL_LANDOWNER"
  | "OTHER";

export type FarmerWaterSourceType =
  | "WELL"
  | "BOREHOLE"
  | "RIVER"
  | "LAKE"
  | "RESERVOIR"
  | "RAINWATER_COLLECTION"
  | "PUBLIC_NETWORK"
  | "OTHER"
  | "UNKNOWN";

export type SolarOwnershipStatus =
  | "YES"
  | "NO"
  | "PLANNING"
  | "NOT_SURE";

export interface UserAccountRecord {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  role: "FARMER" | "AGRONOMIST" | "ADMIN";
  authProvider: "EMAIL" | "GOOGLE";
  googleId?: string | null;
  emailVerified: boolean;
  resetTokenHash?: string | null;
  resetTokenExpiresAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface FarmerProfileRecord {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
  email: string;
  avatarUrl?: string | null;
  country: string;
  governorate?: string | null;
  delegation?: string | null;
  locality?: string | null;
  preferredLanguage: "en" | "fr" | "ar";
  preferredUnits: "metric" | "sqm";
  experienceLevel: FarmerExperienceLevel;
  activityType: FarmerActivityType;
  createdAt: string;
  updatedAt: string;
}

export interface OnboardingProgressRecord {
  id: string;
  userId: string;
  activeFarmId?: string | null;
  currentStep: number;
  completedSteps: number[];
  isCompleted: boolean;
  completedAt?: string | null;
  updatedAt: string;
}

export interface FarmCropRecord {
  id: string;
  farmId: string;
  cropCode: string;
  cropName: string;
  cultivatedAreaHa: number;
  areaUnit: "ha" | "m2";
  plantingDate?: string | null;
  growthStage?: string | null;
  plotCount: number;
  plantingDensity?: string | null;
  irrigationMethod: IrrigationMethod;
}

export interface FarmerWaterSourceRecord {
  id: string;
  farmId: string;
  sourceType: FarmerWaterSourceType;
  latitude?: number | null;
  longitude?: number | null;
  distanceMeters?: number | null;
  availability?: string | null;
  wellDepthM?: number | null;
  flowRateM3Hr?: number | null;
  waterQualityNotes?: string | null;
  isFarmerProvided: boolean;
}

export type WaterSourceType =
  | "RIVER"
  | "STREAM"
  | "CANAL"
  | "LAKE"
  | "RESERVOIR"
  | "WELL"
  | "SPRING"
  | "WATER_INFRASTRUCTURE";

export type WaterProvider = "OSM_OVERPASS" | "HYDRORIVERS" | "HYDROSHEDS";

export type FeasibilityVerdict =
  | "HIGHLY_FEASIBLE"
  | "FEASIBLE_WITH_MITIGATION"
  | "CONDITIONAL"
  | "HIGH_RISK";

export interface GeoPolygon {
  type: "Polygon";
  coordinates: number[][][];
}

export interface FarmPin {
  id: string;
  farmId: string;
  label: string;
  role: PinRole;
  latitude: number;
  longitude: number;
  elevationM: number | null;
  notes?: string | null;
  createdAt: string;
}

export interface SoilProfileData {
  textureClass: SoilTextureClass;
  fieldCapacityMmM: number;
  wiltingPointMmM: number;
  tawMmM: number;
  infiltrationRateMmHr: number;
  organicMatterPct?: number | null;
  ph?: number | null;
  source: string;
  updatedAt: string;
}

export interface SolarConfigurationData {
  solarStatus?: SolarOwnershipStatus;
  capacityKwp: number;
  panelCount?: number | null;
  panelWattageW?: number | null;
  tiltDeg: number;
  azimuthDeg: number;
  mountingType: "free" | "building";
  systemLossPct: number;
  optimizeAngles: boolean;
  hasBattery?: boolean;
  batteryCapacityKwh?: number | null;
  hasGridConnection?: boolean;
  wantsEstimate?: "YES" | "NO" | "NOT_SURE";
  budgetAmount?: number | null;
  isFarmerProvided?: boolean;
  updatedAt: string;
}

export interface PumpConfigurationData {
  hasPump?: boolean;
  pumpType?: string | null;
  powerKw?: number | null;
  flowRateM3Hr: number;
  staticHeadM: number;
  pipeLengthM: number;
  pipeDiameterMm: number;
  pipeMaterialC: number;
  frictionLossM: number;
  operatingPressureHeadM: number;
  totalDynamicHeadM: number;
  pumpEfficiencyPct: number;
  motorEfficiencyPct: number;
  operatingHoursDay: number;
  isFarmerProvided?: boolean;
  updatedAt: string;
}

export interface IrrigationConfigurationData {
  cropCode: string;
  irrigatedAreaHa: number;
  irrigationMethod: IrrigationMethod;
  applicationEfficiencyPct: number;
  plantingMonth: number;
}

export interface WeatherAlert {
  id: string;
  severity: "INFO" | "WARNING" | "CRITICAL";
  type: "FROST" | "HEAT_STRESS" | "HIGH_WIND" | "HEAVY_RAIN" | "HIGH_ET0";
  title: string;
  description: string;
  date: string;
  metricValue: number;
  threshold: number;
  unit: string;
}

export interface WeatherAlertThresholds {
  frostMinTempC: number;
  heatMaxTempC: number;
  highWindKmh: number;
  heavyRainMm: number;
  highEt0Mm: number;
}

export interface DailyForecastPoint {
  date: string;
  tempMaxC: number;
  tempMinC: number;
  precipMm: number;
  precipProbPct: number | null;
  windSpeedMaxKmh: number;
  windDirectionDeg: number | null;
  shortwaveRadiationMjM2: number | null;
  et0Mm: number | null;
}

export interface WeatherForecastResult {
  latitude: number;
  longitude: number;
  timezone: string;
  elevationM: number | null;
  current: {
    temperatureC: number;
    relativeHumidityPct: number;
    precipitationMm: number;
    windSpeedKmh: number;
    windDirectionDeg: number;
    weatherCode: number;
    weatherSummary: string;
    observedAt: string;
  };
  daily: DailyForecastPoint[];
  alerts: WeatherAlert[];
  thresholds: WeatherAlertThresholds;
  citation: DataSourceCitation;
}

export interface MonthlyClimateSummary {
  monthIndex: number; // 1..12
  monthName: string;
  tempMinAvgC: number;
  tempMaxAvgC: number;
  tempMeanAvgC: number;
  precipSumMm: number;
  et0SumMm: number;
  radiationAvgMjM2Day: number;
  rainyDays: number;
  waterBalanceMm: number;
  growingDegreeDays: number;
}

export interface SeasonalClimateSummary {
  season: "Winter" | "Spring" | "Summer" | "Autumn";
  months: string;
  precipSumMm: number;
  et0SumMm: number;
  tempMeanAvgC: number;
  moistureDeficitMm: number;
}

export type AridityClass =
  | "Hyper-Arid"
  | "Arid"
  | "Semi-Arid"
  | "Dry Sub-Humid"
  | "Humid";

export interface HistoricalClimateResult {
  latitude: number;
  longitude: number;
  periodStart: string;
  periodEnd: string;
  annualPrecipMm: number;
  annualEt0Mm: number;
  annualMeanTempC: number;
  annualGddBase10: number;
  aridityIndex: number;
  aridityClass: AridityClass;
  monthly: MonthlyClimateSummary[];
  seasons: SeasonalClimateSummary[];
  citation: DataSourceCitation;
}

export interface ElevationResult {
  farmLatitude: number;
  farmLongitude: number;
  farmElevationM: number;
  fieldMinElevationM: number;
  fieldMaxElevationM: number;
  fieldReliefM: number;
  estimatedSlopePct: number;
  slopeAspect: string;
  samplePoints: Array<{
    label: string;
    latitude: number;
    longitude: number;
    elevationM: number;
  }>;
  citation: DataSourceCitation;
}

export interface WaterSourceFeature {
  id: string;
  externalId: string;
  name: string;
  sourceType: WaterSourceType;
  provider: WaterProvider;
  latitude: number;
  longitude: number;
  distanceFromCentroidM: number;
  distanceFromBoundaryM: number;
  bearingDegrees: number;
  cardinalDirection: string;
  spatialRelationship:
    | "INSIDE_BOUNDARY"
    | "ADJACENT_<100M"
    | "NEARBY_<1KM"
    | "REGIONAL_1_10KM"
    | "DISTANT_>10KM";
  elevationM: number | null;
  elevationDiffFromFarmM: number | null;
  confidence: string;
  operationalVerified: false;
  disclaimer: string;
  tags?: Record<string, string>;
  retrievedAt: string;
}

export interface HydroBasinContext {
  hybasId: string | null;
  pfafstetterId: string | null;
  subBasinAreaKm2: number | null;
  upstreamAreaKm2: number | null;
  distanceToSinkKm: number | null;
  isEndorheic: boolean | null;
  irrigationGrossDemand: number | null;
  irrigationWaterGap: number | null;
  irrigationWithdrawal: number | null;
  citation: DataSourceCitation;
}

export interface WaterSourcesResult {
  latitude: number;
  longitude: number;
  searchRadiusM: number;
  nearestSource: WaterSourceFeature | null;
  sources: WaterSourceFeature[];
  hydroBasin: HydroBasinContext | null;
  citations: DataSourceCitation[];
  mandatoryWarning: string;
  retrievedAt: string;
}

export interface WaPORLayerValue {
  mapsetCode: string;
  caption: string;
  unit: string;
  spatialResolution: string;
  temporalResolution: string;
  year: string;
  value: number | null;
  provenance: DataProvenanceType;
  rasterUrl: string;
  notes?: string;
}

export interface WaPORAnalysisResult {
  latitude: number;
  longitude: number;
  actualEvapotranspirationMmYr: number | null;
  referenceEvapotranspirationMmYr: number | null;
  precipitationMmYr: number | null;
  relativeEvapotranspiration: number | null;
  totalBiomassProductionKgHa: number | null;
  netBiomassWaterProductivityKgM3: number | null;
  l2HighResAetiMmYr: number | null;
  l2CoverageAvailable: boolean;
  layers: WaPORLayerValue[];
  citation: DataSourceCitation;
  limitations: string;
}

export interface MonthlySolarProduction {
  monthIndex: number;
  monthName: string;
  dailyAvgKwh: number;
  monthlyKwh: number;
  inPlaneIrradiationDailyKwhM2: number;
  inPlaneIrradiationMonthlyKwhM2: number;
  interAnnualSdKwh: number;
}

export interface SolarAnalysisResult {
  latitude: number;
  longitude: number;
  capacityKwp: number;
  tiltDeg: number;
  azimuthDeg: number;
  mountingType: "free" | "building";
  systemLossPct: number;
  dailyAvgKwh: number;
  monthlyAvgKwh: number;
  annualKwh: number;
  specificYieldKwhPerKwp: number;
  optimalTiltDeg: number | null;
  optimalAzimuthDeg: number | null;
  lossesBreakdown: {
    angleOfIncidencePct: number | null;
    spectralPct: number | null;
    temperatureAndIrradiancePct: number | null;
    totalLossPct: number;
  };
  monthly: MonthlySolarProduction[];
  seasonal: Array<{
    season: "Winter" | "Spring" | "Summer" | "Autumn";
    kwh: number;
    sharePct: number;
  }>;
  isEstimatedFallback: boolean;
  citation: DataSourceCitation;
}

export interface PumpCalculationInput {
  flowRateM3Hr: number;
  staticElevationDiffM: number;
  drawdownM?: number;
  pipeLengthM: number;
  pipeDiameterMm: number;
  pipeMaterialC?: number; // Hazen-Williams C (default 140 for HDPE/PVC)
  operatingPressureHeadM: number;
  pumpEfficiencyPct: number;
  motorEfficiencyPct: number;
  operatingHoursDay: number;
  overrideTotalDynamicHeadM?: number;
}

export interface PumpCalculationResult {
  flowRateM3Hr: number;
  flowRateM3Sec: number;
  staticHeadM: number;
  frictionLossM: number;
  fittingsLossM: number;
  operatingPressureHeadM: number;
  totalDynamicHeadM: number;
  combinedEfficiencyPct: number;
  hydraulicPowerKw: number;
  electricalPowerKw: number;
  dailyVolumeM3: number;
  dailyEnergyKwh: number;
  monthlyEnergyKwh: number;
  annualEnergyKwh: number;
  specificEnergyKwhPerM3: number;
  recommendedPvArrayKwp: number;
  engineeringNotes: string[];
}

export interface CropSpec {
  code: string;
  name: string;
  scientificName: string;
  category: string;
  kcIni: number;
  kcMid: number;
  kcEnd: number;
  stageIniDays: number;
  stageDevDays: number;
  stageMidDays: number;
  stageLateDays: number;
  rootDepthMinM: number;
  rootDepthMaxM: number;
  depletionFractionP: number;
  yieldResponseKy: number;
  optimalTempMinC: number;
  optimalTempMaxC: number;
  droughtTolerance: "Low" | "Moderate" | "High";
  salinityToleranceDsm: number;
  growingSeason?: string;
  waterSensitivity?: "Low" | "Moderate" | "High";
}

export interface MonthlyIrrigationDemand {
  monthIndex: number;
  monthName: string;
  et0Mm: number;
  kc: number;
  etcMm: number;
  precipMm: number;
  effectiveRainMm: number;
  netIrrigationMm: number;
  grossIrrigationMm: number;
  grossVolumeM3: number;
  dailyPeakM3: number;
  requiredPumpHoursPerDay: number;
}

export interface CropWaterRequirementResult {
  crop: CropSpec;
  irrigatedAreaHa: number;
  irrigationMethod: IrrigationMethod;
  applicationEfficiencyPct: number;
  plantingMonth: number;
  annualEt0Mm: number;
  annualEtcMm: number;
  annualEffectiveRainMm: number;
  annualNetIrrigationMm: number;
  annualGrossIrrigationMm: number;
  annualGrossVolumeM3: number;
  peakMonthName: string;
  peakDailyWaterM3: number;
  totalAvailableWaterMm: number;
  readilyAvailableWaterMm: number;
  peakIrrigationIntervalDays: number;
  monthly: MonthlyIrrigationDemand[];
  missingDataWarnings: string[];
  methodology: string;
}

export interface CropSuitabilityScore {
  cropCode: string;
  cropName: string;
  category: string;
  score: number;
  rating: "HIGH" | "MODERATE" | "LOW";
  estimatedAnnualIrrigationM3Ha: number;
  thermalMatchNote: string;
  waterDemandNote: string;
}

export interface SolarIrrigationComparisonResult {
  annualSolarKwh: number;
  annualPumpKwh: number;
  annualNetBalanceKwh: number;
  annualCoveragePct: number;
  worstMonthName: string;
  worstMonthCoveragePct: number;
  worstMonthDeficitKwh: number;
  directDriveFeasible: boolean;
  recommendedBatteryKwh: number;
  recommendedWaterStorageTankM3: number;
  estimatedGridDependencyPct: number;
  monthly: Array<{
    monthIndex: number;
    monthName: string;
    solarKwh: number;
    pumpKwh: number;
    surplusDeficitKwh: number;
    coveragePct: number;
    requiredPumpHoursDay: number;
  }>;
  engineeringWarnings: string[];
}

export interface FarmRecord {
  id: string;
  userId: string;
  name: string;
  description?: string | null;
  country?: string | null;
  region?: string | null;
  governorate?: string | null;
  delegation?: string | null;
  locality?: string | null;
  centerLat: number;
  centerLon: number;
  elevationM?: number | null;
  areaHectares: number;
  perimeterMeters: number;
  boundary?: GeoPolygon | null;
  boundaryVerified?: boolean;
  pins: FarmPin[];
  crops?: FarmCropRecord[];
  allowCropOverlap?: boolean;
  farmerWaterSources?: FarmerWaterSourceRecord[];
  soilProfile: SoilProfileData;
  solarConfig: SolarConfigurationData;
  pumpConfig: PumpConfigurationData;
  irrigationConfig: IrrigationConfigurationData;
  createdAt: string;
  updatedAt: string;
}

export interface CompleteFarmAnalysisBundle {
  farmId: string;
  coordinates: { latitude: number; longitude: number };
  weather: WeatherForecastResult;
  climate: HistoricalClimateResult;
  elevation: ElevationResult;
  waterSources: WaterSourcesResult;
  wapor: WaPORAnalysisResult;
  solar: SolarAnalysisResult;
  irrigation: CropWaterRequirementResult;
  pump: PumpCalculationResult;
  solarVsPump: SolarIrrigationComparisonResult;
  cropSuitability: CropSuitabilityScore[];
  generatedAt: string;
}

export interface FeasibilityReportPayload {
  id: string;
  farmId: string;
  farmName: string;
  title: string;
  overallScore: number;
  verdict: FeasibilityVerdict;
  executiveSummary: string;
  propertyOverview: {
    coordinates: { latitude: number; longitude: number };
    areaHectares: number;
    perimeterMeters: number;
    elevationM: number;
    slopePct: number;
    country?: string | null;
    region?: string | null;
    primaryCrop: string;
    soilTexture: SoilTextureClass;
  };
  weatherSummary: {
    currentTempC: number;
    annualPrecipMm: number;
    annualEt0Mm: number;
    aridityIndex: number;
    aridityClass: AridityClass;
    activeAlertsCount: number;
  };
  waterSummary: {
    nearestSourceName: string | null;
    nearestSourceType: string | null;
    nearestDistanceM: number | null;
    elevationDiffM: number | null;
    sourcesCount: number;
    hydroBasinId: string | null;
    disclaimer: string;
  };
  irrigationAndPumpSummary: {
    annualEtcMm: number;
    annualGrossWaterM3: number;
    peakDailyWaterM3: number;
    totalDynamicHeadM: number;
    electricalPowerKw: number;
    dailyPumpEnergyKwh: number;
    annualPumpEnergyKwh: number;
  };
  solarSummary: {
    capacityKwp: number;
    annualSolarKwh: number;
    annualCoveragePct: number;
    worstMonthName: string;
    worstMonthCoveragePct: number;
    recommendedBatteryKwh: number;
    recommendedTankM3: number;
  };
  cropSuitability: CropSuitabilityScore[];
  risks: Array<{
    category: "CLIMATE" | "WATER" | "HYDRAULIC" | "ENERGY" | "AGRONOMIC";
    severity: "HIGH" | "MODERATE" | "LOW";
    title: string;
    detail: string;
  }>;
  recommendations: string[];
  sources: DataSourceCitation[];
  uncertainties: string[];
  createdAt: string;
}

export interface AIToolExecutionTrace {
  id: string;
  toolName: string;
  arguments: Record<string, unknown>;
  resultSummary: string;
  provenance: DataProvenanceType;
  executedAt: string;
  data?: unknown;
}

export interface AIChatMessageRecord {
  id: string;
  role: "user" | "assistant";
  content: string;
  toolCalls?: AIToolExecutionTrace[];
  citations?: DataSourceCitation[];
  modelUsed?: string;
  createdAt: string;
}

export interface SyncQueueItem {
  seq?: number;
  operationId: string;
  entityType: "FARM" | "PIN" | "BOUNDARY" | "CONFIG" | "REPORT" | "ONBOARDING";
  entityId: string;
  action: "CREATE" | "UPDATE" | "DELETE";
  payload: unknown;
  clientTimestamp: string;
  status: "PENDING" | "SYNCING" | "APPLIED" | "CONFLICT" | "ERROR";
  conflictServerRecord?: unknown;
  errorMessage?: string;
}

export interface SensorDeviceRecord {
  id: string;
  farmId: string;
  name: string;
  tokenHash: string;
  createdAt: string;
  lastSeenAt: string | null;
  revokedAt: string | null;
}

export interface SensorReadingRecord {
  id: string;
  deviceId: string;
  farmId: string;
  recordedAt: string;
  receivedAt: string;
  airTempC: number | null;
  airHumidityPct: number | null;
  soilMoisturePct: number | null;
  soilRaw: number | null;
  waterLevelPct: number | null;
  waterRaw: number | null;
  pumpOn: boolean;
  soilFault: boolean;
}

export interface SensorDevicePublicRecord {
  id: string;
  farmId: string;
  name: string;
  createdAt: string;
  lastSeenAt: string | null;
  revokedAt: string | null;
  latestReading: SensorReadingRecord | null;
}

export interface FarmSensorsBundle {
  farmId: string;
  devices: SensorDevicePublicRecord[];
  latestReading: SensorReadingRecord | null;
  readings24h: SensorReadingRecord[];
}

// ---------------------------------------------------------------------------
// FarmBrain Potential & Savings + Agricultural Decision Simulator
// ---------------------------------------------------------------------------

export type FarmBrainProvenance =
  | "MEASURED"
  | "FARMER_PROVIDED"
  | "ESTIMATED"
  | "SCIENTIFIC_DEFAULT";

export interface FarmBrainCompletenessItem {
  key: string;
  label: string;
  present: boolean;
  provenance: FarmBrainProvenance;
  impact: "HIGH" | "MEDIUM" | "LOW";
  detail: string;
}

export interface FarmBrainSavingsBreakdown {
  baselineWaterM3Yr: number;
  smartWaterM3Yr: number;
  waterSavedM3Yr: number;
  waterSavedLitresYr: number;
  waterSavingsPct: number;
  baselineEnergyKwhYr: number;
  smartEnergyKwhYr: number;
  energySavedKwhYr: number;
  energySavingsPct: number;
  baselineManualHoursYr: number;
  smartManualHoursYr: number;
  timeSavedHoursYr: number;
  baselineWaterCostTndYr: number;
  smartWaterCostTndYr: number;
  waterCostSavedTndYr: number;
  baselineEnergyCostTndYr: number;
  smartEnergyCostTndYr: number;
  energyCostSavedTndYr: number;
  totalEstimatedSavingsTndYr: number;
  solarCoversPumpElectricity: boolean;
  electricityTariffTndPerKwh: number | null;
  waterTariffTndPerM3: number | null;
  methodologyNotes: string[];
}

export interface FarmBrainVerifiedSavingsTracking {
  tier: "INITIAL_PROJECTION" | "SENSOR_UPDATED_PROJECTION" | "VERIFIED_ACTUAL";
  initialProjectedWaterSavedM3Yr: number;
  sensorUpdatedWaterSavedM3Yr: number | null;
  verifiedActualWaterSavedM3: number | null;
  verifiedActualEnergySavedKwh: number | null;
  verifiedActualSavingsTnd: number | null;
  observedPumpHours24h: number;
  observedPumpCycles24h: number;
  freshSensorUsed: boolean;
  lastSensorAt: string | null;
  explanation: string;
}

export interface FarmBrainDailyMoistureForecastPoint {
  dayIndex: number;
  date: string;
  expectedMoisturePct: number;
  lowerBandPct: number;
  upperBandPct: number;
  rainMm: number;
  et0Mm: number;
  recommendedIrrigationMm: number;
  method: "ML_RANDOM_FOREST" | "PHYSICS_WATER_BALANCE";
}

export interface FarmBrainPlotBreakdown {
  plotId: string;
  cropCode: string;
  cropName: string;
  areaHa: number;
  growthStage: string;
  irrigationMethod: IrrigationMethod;
  baselineWaterM3Yr: number;
  smartWaterM3Yr: number;
  waterSavedM3Yr: number;
  efficiencyGainPct: number;
  suitabilityScore: number;
  yieldResponseModel: "FAO_AQUACROP_P66" | "FAO33_WATER_PRODUCTION";
  estimatedYieldTonHa: number | null;
  priorityScore: number;
}

export interface FarmBrainExplainableAdvice {
  id: string;
  priority: "HIGH" | "MEDIUM" | "LOW";
  whatIsHappening: string;
  why: string;
  whatToDo: string;
  estimatedImpact?: string;
  provenance: FarmBrainProvenance;
}

export interface FarmBrainAnalysisRecord {
  id: string;
  farmId: string;
  userId: string;
  version: number;
  dataCompletenessPct: number;
  completenessItems: FarmBrainCompletenessItem[];
  savings: FarmBrainSavingsBreakdown;
  verifiedTracking: FarmBrainVerifiedSavingsTracking;
  soilMoistureForecast7d: FarmBrainDailyMoistureForecastPoint[];
  plotBreakdowns: FarmBrainPlotBreakdown[];
  recommendations: FarmBrainExplainableAdvice[];
  soilAnomalyDetected: boolean;
  soilAnomalyReason: string | null;
  mlModelsUsed: Array<{
    modelName: string;
    algorithm: string;
    validationR2: number | null;
    validationMae: number | null;
    source: "ARTIFACT_MODEL" | "PYTHON_SERVICE" | "PHYSICS_FALLBACK";
  }>;
  assumptions: string[];
  limitations: string[];
  generatedAt: string;
  updatedAt: string;
}

export type SimulationScenarioType =
  | "WATER_SHORTAGE"
  | "CHANGE_CROP"
  | "WEATHER_CLIMATE"
  | "IRRIGATION_STRATEGY"
  | "FARM_EXPANSION";

export type IrrigationScheduleStrategy =
  | "CURRENT"
  | "DAILY"
  | "EVERY_2_DAYS"
  | "MOISTURE_TRIGGER"
  | "AI_OPTIMIZED";

export interface SimulationScenarioInputs {
  scenarioType: SimulationScenarioType;
  availableWaterLitres?: number;
  targetPlotId?: string;
  newCropCode?: string;
  tempDeltaC?: number;
  rainChangePct?: number;
  humidityDeltaPct?: number;
  horizonDays?: number;
  strategy?: IrrigationScheduleStrategy;
  moistureThresholdPct?: number;
  addedAreaHa?: number;
  addedCropCode?: string;
  addedIrrigationMethod?: IrrigationMethod;
  waterTariffTndPerM3?: number | null;
  electricityTariffTndPerKwh?: number | null;
}

export interface SimulationPlotAllocation {
  plotId: string;
  cropCode: string;
  cropName: string;
  areaHa: number;
  growthStage: string;
  requestedLitresDay: number;
  allocatedLitresDay: number;
  fulfillmentPct: number;
  estimatedYieldImpactPct: number;
  priorityWeight: number;
  rationale: string;
}

export interface SimulationDailyTrajectoryPoint {
  day: number;
  date: string;
  baselineMoisturePct: number;
  simulatedMoisturePct: number;
  baselineIrrigationMm: number;
  simulatedIrrigationMm: number;
  cumulativeWaterSavedM3: number;
}

export interface SimulationScenarioResult {
  scenarioType: SimulationScenarioType;
  headlineOutcome: string;
  riskLevel: "LOW" | "MODERATE" | "HIGH";
  baselineWaterM3Season: number;
  simulatedWaterM3Season: number;
  waterDeltaM3Season: number;
  waterDeltaPct: number;
  baselineEnergyKwhSeason: number;
  simulatedEnergyKwhSeason: number;
  energyDeltaKwhSeason: number;
  estimatedCostDeltaTnd: number | null;
  estimatedYieldChangePct: number;
  pumpOverloadRisk: boolean;
  pumpRequiredHoursDay: number;
  pumpMaxSafeHoursDay: number;
  solarCoverageBeforePct: number;
  solarCoverageAfterPct: number;
  allocations?: SimulationPlotAllocation[];
  trajectory30d: SimulationDailyTrajectoryPoint[];
  cropComparison?: {
    currentCropCode: string;
    currentCropName: string;
    newCropCode: string;
    newCropName: string;
    currentSuitabilityScore: number;
    newSuitabilityScore: number;
    currentCycleDays: number;
    newCycleDays: number;
    currentWaterM3Ha: number;
    newWaterM3Ha: number;
    currentEstimatedYieldTonHa: number | null;
    newEstimatedYieldTonHa: number | null;
    yieldModelUsed: "FAO_AQUACROP_P66" | "FAO33_WATER_PRODUCTION";
  };
  explanation: {
    whatChanges: string;
    whyItHappens: string;
    whatFarmerShouldDo: string;
  };
  assumptions: string[];
  computedAt: string;
}

export interface SimulationScenarioRecord {
  id: string;
  farmId: string;
  userId: string;
  name: string;
  scenarioType: SimulationScenarioType;
  inputs: SimulationScenarioInputs;
  result: SimulationScenarioResult | null;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
  lastRunAt: string | null;
}

export interface SimulationComparisonResult {
  farmId: string;
  scenarios: Array<{
    id: string;
    name: string;
    scenarioType: SimulationScenarioType;
    waterDeltaM3Season: number;
    waterDeltaPct: number;
    energyDeltaKwhSeason: number;
    estimatedCostDeltaTnd: number | null;
    estimatedYieldChangePct: number;
    riskLevel: "LOW" | "MODERATE" | "HIGH";
    headlineOutcome: string;
  }>;
  bestForWaterSavingId: string | null;
  bestForYieldProtectionId: string | null;
  bestOverallId: string | null;
  summary: string;
  generatedAt: string;
}

export interface MLModelMetadataRecord {
  id: string;
  modelName: string;
  algorithm: string;
  version: string;
  targetVariable: string;
  mae: number;
  rmse: number;
  r2: number;
  trainSamples: number;
  testSamples: number;
  featureNames: string[];
  trainedAt: string;
}

export interface MLPredictionLogRecord {
  id: string;
  farmId: string;
  modelName: string;
  inputSummary: Record<string, unknown>;
  outputSummary: Record<string, unknown>;
  provenance: FarmBrainProvenance;
  createdAt: string;
}
