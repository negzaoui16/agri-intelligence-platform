import {
  getAnalysisBundle,
  getFarmById,
  getFarmSensorsBundle,
  getLatestFarmBrainAnalysis,
  listFarmBrainHistory,
  logMLPrediction,
  saveFarmBrainAnalysis,
  upsertMLModelMetadata,
} from "@/lib/db/repository";
import {
  computeFarmBrainAnalysis,
  getTrainedMlMetadataSummary,
} from "@/lib/engines/farmbrain-engine";
import type { FarmBrainAnalysisRecord } from "@/types/agri";

export async function runAndPersistFarmBrainAnalysis(params: {
  farmId: string;
  userId: string;
  waterTariffTndPerM3?: number | null;
  electricityTariffTndPerKwh?: number | null;
}): Promise<FarmBrainAnalysisRecord | null> {
  const farm = await getFarmById(params.farmId, params.userId);
  if (!farm) return null;

  const existingBundle = getAnalysisBundle(farm.id);
  const sensors = await getFarmSensorsBundle(farm.id, params.userId).catch(() => null);
  const previous = await getLatestFarmBrainAnalysis(farm.id, params.userId);

  const computed = computeFarmBrainAnalysis({
    farm,
    analysis: existingBundle,
    sensors,
    waterTariffTndPerM3: params.waterTariffTndPerM3 ?? previous?.savings.waterTariffTndPerM3 ?? null,
    electricityTariffTndPerKwh:
      params.electricityTariffTndPerKwh ?? previous?.savings.electricityTariffTndPerKwh ?? null,
    previousVersion: previous?.version ?? 0,
  });

  await saveFarmBrainAnalysis(computed);

  // Sync ML model metadata and log prediction provenance non-fatally
  try {
    const mlMeta = getTrainedMlMetadataSummary();
    await Promise.all([
      upsertMLModelMetadata({
        id: "ml_soil_moisture_forecaster",
        modelName: "soil_moisture_forecaster",
        algorithm: mlMeta.models.soil_moisture_forecaster.algorithm,
        version: mlMeta.version,
        targetVariable: "next_day_soil_moisture_pct",
        mae: mlMeta.models.soil_moisture_forecaster.metrics.mae,
        rmse: mlMeta.models.soil_moisture_forecaster.metrics.rmse,
        r2: mlMeta.models.soil_moisture_forecaster.metrics.r2,
        trainSamples: mlMeta.trainSamples,
        testSamples: mlMeta.testSamples,
        featureNames: [
          "soil_moisture_t0",
          "temp_max_c",
          "humidity_pct",
          "rain_mm",
          "et0_mm",
          "irrigation_mm",
          "kc",
          "taw_mm_m",
          "infiltration_mm_hr",
          "doy_sin",
          "doy_cos",
        ],
        trainedAt: mlMeta.trainedAt,
      }),
      upsertMLModelMetadata({
        id: "ml_irrigation_water_demand",
        modelName: "irrigation_water_demand",
        algorithm: mlMeta.models.irrigation_water_demand.algorithm,
        version: mlMeta.version,
        targetVariable: "optimal_irrigation_mm",
        mae: mlMeta.models.irrigation_water_demand.metrics.mae,
        rmse: mlMeta.models.irrigation_water_demand.metrics.rmse,
        r2: mlMeta.models.irrigation_water_demand.metrics.r2,
        trainSamples: mlMeta.trainSamples,
        testSamples: mlMeta.testSamples,
        featureNames: [
          "soil_moisture_t0",
          "temp_max_c",
          "humidity_pct",
          "rain_mm",
          "et0_mm",
          "kc",
          "taw_mm_m",
          "doy_sin",
          "doy_cos",
        ],
        trainedAt: mlMeta.trainedAt,
      }),
      logMLPrediction({
        id: `mlog_${Date.now()}`,
        farmId: farm.id,
        modelName: "farmbrain_combined_pipeline",
        inputSummary: {
          areaHa: farm.areaHectares,
          plotsCount: farm.crops?.length ?? 1,
          hasLiveSensor: Boolean(sensors?.latestReading),
        },
        outputSummary: {
          waterSavedM3Yr: computed.savings.waterSavedM3Yr,
          waterSavingsPct: computed.savings.waterSavingsPct,
          tier: computed.verifiedTracking.tier,
        },
        provenance: sensors?.latestReading ? "MEASURED" : "FARMER_PROVIDED",
        createdAt: computed.generatedAt,
      }),
    ]);
  } catch {
    // Telemetry metadata logging must never fail user analysis
  }

  return computed;
}

export async function getOrCreateFarmBrainOverview(params: {
  farmId: string;
  userId: string;
}): Promise<FarmBrainAnalysisRecord | null> {
  const existing = await getLatestFarmBrainAnalysis(params.farmId, params.userId);
  if (existing) return existing;
  return runAndPersistFarmBrainAnalysis(params);
}

export async function getFarmBrainHistoryList(params: {
  farmId: string;
  userId: string;
  limit?: number;
}) {
  return listFarmBrainHistory(params.farmId, params.userId, params.limit ?? 20);
}
