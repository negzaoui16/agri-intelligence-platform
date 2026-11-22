import { NextResponse } from "next/server";
import { apiError, withApiRateLimit } from "@/lib/api/http";
import { getSessionState } from "@/lib/auth/session";
import {
  getAnalysisBundle,
  getFarmById,
  getFarmSensorsBundle,
} from "@/lib/db/repository";
import {
  computeFarmBrainAnalysis,
  getTrainedMlMetadataSummary,
} from "@/lib/engines/farmbrain-engine";
import { predictSoilMoistureSchema } from "@/lib/validation/schemas";

export async function POST(request: Request) {
  const limited = withApiRateLimit(request, "predict_soil_moisture", 40);
  if (limited) return limited;

  const state = await getSessionState();
  if (!state.user) return apiError("Authentication required", 401);

  const raw = await request.json().catch(() => ({}));
  const parsed = predictSoilMoistureSchema.safeParse(raw);
  if (!parsed.success) {
    return apiError("Invalid soil moisture prediction request", 400, parsed.error.flatten());
  }

  if (parsed.data.farmId) {
    const farm = await getFarmById(parsed.data.farmId, state.user.id);
    if (!farm) return apiError("Farm not found", 404);
    const analysis = getAnalysisBundle(farm.id);
    const sensors = await getFarmSensorsBundle(farm.id, state.user.id).catch(() => null);
    const fb = computeFarmBrainAnalysis({ farm, analysis, sensors });
    return NextResponse.json({
      farmId: farm.id,
      forecast: fb.soilMoistureForecast7d,
      modelMetrics: getTrainedMlMetadataSummary().models.soil_moisture_forecaster,
    });
  }

  // Ad-hoc prediction with default synthetic Mediterranean farm envelope
  const nowIso = new Date().toISOString();
  const syntheticFarm = computeFarmBrainAnalysis({
    farm: {
      id: "adhoc_predict",
      userId: state.user.id,
      name: "Adhoc Prediction",
      centerLat: 36.4,
      centerLon: 10.6,
      areaHectares: 2,
      perimeterMeters: 600,
      pins: [],
      soilProfile: {
        textureClass: "LOAM",
        fieldCapacityMmM: 290,
        wiltingPointMmM: 140,
        tawMmM: parsed.data.tawMmM,
        infiltrationRateMmHr: parsed.data.infiltrationMmHr,
        source: "API_INPUT",
        updatedAt: nowIso,
      },
      solarConfig: {
        capacityKwp: 4,
        tiltDeg: 31,
        azimuthDeg: 0,
        mountingType: "free",
        systemLossPct: 14,
        optimizeAngles: false,
        updatedAt: nowIso,
      },
      pumpConfig: {
        flowRateM3Hr: 15,
        staticHeadM: 15,
        pipeLengthM: 100,
        pipeDiameterMm: 63,
        pipeMaterialC: 140,
        frictionLossM: 2,
        operatingPressureHeadM: 15,
        totalDynamicHeadM: 32,
        pumpEfficiencyPct: 65,
        motorEfficiencyPct: 88,
        operatingHoursDay: 5,
        updatedAt: nowIso,
      },
      irrigationConfig: {
        cropCode: "tomato",
        irrigatedAreaHa: 2,
        irrigationMethod: "DRIP",
        applicationEfficiencyPct: 90,
        plantingMonth: 3,
      },
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    sensors: {
      farmId: "adhoc_predict",
      devices: [],
      readings24h: [],
      latestReading: {
        id: "sr_adhoc",
        deviceId: "dev_adhoc",
        farmId: "adhoc_predict",
        recordedAt: nowIso,
        receivedAt: nowIso,
        airTempC: 27,
        airHumidityPct: 55,
        soilMoisturePct: parsed.data.initialMoisturePct,
        soilRaw: null,
        waterLevelPct: 80,
        waterRaw: null,
        pumpOn: false,
        soilFault: false,
      },
    },
  });

  return NextResponse.json({
    forecast: syntheticFarm.soilMoistureForecast7d,
    modelMetrics: getTrainedMlMetadataSummary().models.soil_moisture_forecaster,
  });
}
