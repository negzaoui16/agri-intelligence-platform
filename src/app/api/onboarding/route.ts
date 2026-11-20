import { NextResponse } from "next/server";
import { apiError, withApiRateLimit } from "@/lib/api/http";
import { getSessionState } from "@/lib/auth/session";
import {
  getFarmById,
  getFarmerProfile,
  getOnboardingProgress,
  listFarms,
  upsertFarm,
  upsertFarmerProfile,
  upsertOnboardingProgress,
} from "@/lib/db/repository";
import {
  farmCropInputSchema,
  farmerProfileStageSchema,
  farmerWaterSourceSchema,
  polygonBoundarySchema,
} from "@/lib/validation/schemas";
import type { FarmCropRecord, FarmerWaterSourceRecord, IrrigationMethod } from "@/types/agri";

export async function GET() {
  const state = await getSessionState();
  if (!state.user) {
    return apiError(
      state.isExpired ? "Session expired. Please sign in again." : "Authentication required",
      401
    );
  }

  const profile = getFarmerProfile(state.user.id);
  const progress = getOnboardingProgress(state.user.id);
  const farms = await listFarms(state.user.id);
  const activeFarm =
    (progress.activeFarmId ? farms.find((f) => f.id === progress.activeFarmId) : null) ??
    farms[0] ??
    null;

  return NextResponse.json({
    user: state.user,
    farmerProfile: profile ?? {
      id: `prof_${state.user.id}`,
      userId: state.user.id,
      firstName: state.user.name.split(" ")[0] || "",
      lastName: state.user.name.split(" ").slice(1).join(" ") || "",
      email: state.user.email,
      country: "Tunisia",
      preferredLanguage: "en",
      preferredUnits: "metric",
      experienceLevel: "YEARS_2_5",
      activityType: "SMALL_FAMILY_FARM",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    onboardingProgress: progress,
    activeFarm,
  });
}

export async function PUT(request: Request) {
  const limited = withApiRateLimit(request, "onboarding_save", 60);
  if (limited) return limited;

  const state = await getSessionState();
  if (!state.user) {
    return apiError(
      state.isExpired ? "Session expired. Please sign in again." : "Authentication required",
      401
    );
  }

  try {
    const body = await request.json();
    const stage = Number(body.stage ?? body.currentStep ?? 1);
    const markStepComplete = body.markStepComplete !== false;
    const userId = state.user.id;
    let progress = getOnboardingProgress(userId);
    const nextStep = Number.isFinite(Number(body.nextStep))
      ? Math.min(6, Math.max(1, Number(body.nextStep)))
      : stage;

    // Stage 1 — Farmer Profile
    if (stage === 1 && body.profile) {
      const parsed = farmerProfileStageSchema.safeParse(body.profile);
      if (!parsed.success) {
        return apiError(parsed.error.issues[0]?.message || "Invalid farmer profile", 400);
      }
      const profile = await upsertFarmerProfile(userId, {
        ...parsed.data,
        email: state.user.email,
      });
      progress = await upsertOnboardingProgress(userId, {
        currentStep: nextStep,
        completedSteps: markStepComplete ? [1] : [],
      });
      return NextResponse.json({ farmerProfile: profile, onboardingProgress: progress });
    }

    // Stages 2..5 operate on the single stable active onboarding farm (prevents duplicates on refresh/retry)
    let targetFarmId: string | undefined =
      body.farmId || progress.activeFarmId || undefined;
    if (targetFarmId) {
      const owned = await getFarmById(targetFarmId, userId);
      if (!owned) targetFarmId = undefined;
    }
    const existingFarm = targetFarmId ? await getFarmById(targetFarmId, userId) : null;

    if (stage === 2 && body.farm) {
      const f = body.farm;
      if (!f.name || String(f.name).trim().length < 2) {
        return apiError("Farm name must be at least 2 characters", 400);
      }
      const lat = Number(f.centerLat);
      const lon = Number(f.centerLon);
      if (!Number.isFinite(lat) || lat < -90 || lat > 90 || !Number.isFinite(lon) || lon < -180 || lon > 180) {
        return apiError("Valid GPS coordinates (latitude/longitude) are required", 400);
      }
      const boundaryParsed = f.boundary ? polygonBoundarySchema.safeParse(f.boundary) : null;
      if (f.boundary && boundaryParsed && !boundaryParsed.success) {
        return apiError("Invalid polygon boundary coordinates", 400);
      }

      const savedFarm = await upsertFarm({
        id: targetFarmId,
        userId,
        name: String(f.name).trim(),
        description: f.description ?? null,
        country: f.country || "Tunisia",
        region: [f.governorate, f.delegation].filter(Boolean).join(" / ") || null,
        governorate: f.governorate ?? null,
        delegation: f.delegation ?? null,
        locality: f.locality ?? null,
        centerLat: lat,
        centerLon: lon,
        areaHectares: f.areaHectares ? Number(f.areaHectares) : undefined,
        perimeterMeters: f.perimeterMeters ? Number(f.perimeterMeters) : undefined,
        boundary: boundaryParsed?.success ? boundaryParsed.data : f.boundary === null ? null : existingFarm?.boundary,
        boundaryVerified: Boolean(f.boundary || existingFarm?.boundary),
        pins: Array.isArray(f.pins) ? f.pins : existingFarm?.pins,
      });

      progress = await upsertOnboardingProgress(userId, {
        activeFarmId: savedFarm.id,
        currentStep: nextStep,
        completedSteps: markStepComplete ? [2] : [],
      });

      return NextResponse.json({ farm: savedFarm, onboardingProgress: progress });
    }

    if (!existingFarm) {
      return apiError("Please create your farm in Stage 2 before saving stages 3–5.", 400);
    }

    if (stage === 3) {
      const rawCrops: unknown[] = Array.isArray(body.crops) ? body.crops : [];
      if (rawCrops.length === 0) {
        return apiError("Select at least one crop to cultivate.", 400);
      }
      const parsedCrops: FarmCropRecord[] = [];
      for (const item of rawCrops) {
        const res = farmCropInputSchema.safeParse(item);
        if (!res.success) {
          return apiError(res.error.issues[0]?.message || "Invalid crop data", 400);
        }
        parsedCrops.push({
          id: res.data.id || `fc_${existingFarm.id}_${parsedCrops.length}_${Date.now()}`,
          farmId: existingFarm.id,
          cropCode: res.data.cropCode,
          cropName: res.data.cropName,
          cultivatedAreaHa: res.data.cultivatedAreaHa,
          areaUnit: res.data.areaUnit,
          plantingDate: res.data.plantingDate ?? null,
          growthStage: res.data.growthStage ?? null,
          plotCount: res.data.plotCount,
          plantingDensity: res.data.plantingDensity ?? null,
          irrigationMethod: res.data.irrigationMethod,
        });
      }

      const allowOverlap = Boolean(body.allowCropOverlap);
      const totalCropArea = parsedCrops.reduce((s, c) => s + c.cultivatedAreaHa, 0);
      if (totalCropArea > existingFarm.areaHectares * 1.001 && !allowOverlap) {
        return apiError(
          `Total cultivated crop area (${totalCropArea.toFixed(2)} ha) exceeds farm area (${existingFarm.areaHectares.toFixed(2)} ha). Confirm overlapping/intercropping cultivation to proceed.`,
          400
        );
      }

      const savedFarm = await upsertFarm({
        id: existingFarm.id,
        userId,
        name: existingFarm.name,
        centerLat: existingFarm.centerLat,
        centerLon: existingFarm.centerLon,
        crops: parsedCrops,
        allowCropOverlap: allowOverlap,
        primaryCropCode: parsedCrops[0].cropCode,
        irrigationMethod: parsedCrops[0].irrigationMethod,
      });

      progress = await upsertOnboardingProgress(userId, {
        activeFarmId: savedFarm.id,
        currentStep: nextStep,
        completedSteps: markStepComplete ? [3] : [],
      });

      return NextResponse.json({ farm: savedFarm, onboardingProgress: progress });
    }

    if (stage === 4) {
      const rawSources: unknown[] = Array.isArray(body.waterSources) ? body.waterSources : [];
      const parsedSources: FarmerWaterSourceRecord[] = [];
      for (const ws of rawSources) {
        const res = farmerWaterSourceSchema.safeParse(ws);
        if (!res.success) {
          return apiError(res.error.issues[0]?.message || "Invalid water source details", 400);
        }
        parsedSources.push({
          id: res.data.id || `fws_${existingFarm.id}_${parsedSources.length}`,
          farmId: existingFarm.id,
          sourceType: res.data.sourceType,
          latitude: res.data.latitude ?? null,
          longitude: res.data.longitude ?? null,
          distanceMeters: res.data.distanceMeters ?? null,
          availability: res.data.availability ?? null,
          wellDepthM: res.data.wellDepthM ?? null,
          flowRateM3Hr: res.data.flowRateM3Hr ?? null,
          waterQualityNotes: res.data.waterQualityNotes ?? null,
          isFarmerProvided: true,
        });
      }

      const irrigationMethod = (body.irrigationMethod ||
        existingFarm.irrigationConfig.irrigationMethod ||
        "DRIP") as IrrigationMethod;
      const pump = body.pump ?? {};
      const hasPump = pump.hasPump === true || pump.hasPump === "YES";
      const isFarmerPump = hasPump && (Boolean(pump.flowRateM3Hr) || Boolean(pump.powerKw));

      const savedFarm = await upsertFarm({
        id: existingFarm.id,
        userId,
        name: existingFarm.name,
        centerLat: existingFarm.centerLat,
        centerLon: existingFarm.centerLon,
        farmerWaterSources: parsedSources,
        irrigationMethod,
        pumpConfig: {
          hasPump,
          pumpType: pump.pumpType ?? null,
          powerKw: pump.powerKw ? Number(pump.powerKw) : null,
          flowRateM3Hr: pump.flowRateM3Hr ? Number(pump.flowRateM3Hr) : existingFarm.pumpConfig.flowRateM3Hr,
          operatingHoursDay: pump.operatingHoursDay
            ? Number(pump.operatingHoursDay)
            : existingFarm.pumpConfig.operatingHoursDay,
          pumpEfficiencyPct: pump.pumpEfficiencyPct
            ? Number(pump.pumpEfficiencyPct)
            : existingFarm.pumpConfig.pumpEfficiencyPct,
          isFarmerProvided: isFarmerPump,
        },
      });

      progress = await upsertOnboardingProgress(userId, {
        activeFarmId: savedFarm.id,
        currentStep: nextStep,
        completedSteps: markStepComplete ? [4] : [],
      });

      return NextResponse.json({ farm: savedFarm, onboardingProgress: progress });
    }

    if (stage === 5) {
      const s = body.solar ?? {};
      const status = (s.solarStatus || "NOT_SURE") as "YES" | "NO" | "PLANNING" | "NOT_SURE";
      const computedKwp =
        s.capacityKwp
          ? Number(s.capacityKwp)
          : s.panelCount && s.panelWattageW
          ? Number(((Number(s.panelCount) * Number(s.panelWattageW)) / 1000).toFixed(2))
          : existingFarm.solarConfig.capacityKwp;

      const savedFarm = await upsertFarm({
        id: existingFarm.id,
        userId,
        name: existingFarm.name,
        centerLat: existingFarm.centerLat,
        centerLon: existingFarm.centerLon,
        solarConfig: {
          solarStatus: status,
          capacityKwp: computedKwp,
          panelCount: s.panelCount ? Number(s.panelCount) : null,
          panelWattageW: s.panelWattageW ? Number(s.panelWattageW) : null,
          tiltDeg:
            s.tiltDeg !== undefined && s.tiltDeg !== "" && s.tiltDeg !== null
              ? Number(s.tiltDeg)
              : existingFarm.solarConfig.tiltDeg,
          azimuthDeg:
            s.azimuthDeg !== undefined && s.azimuthDeg !== "" && s.azimuthDeg !== null
              ? Number(s.azimuthDeg)
              : existingFarm.solarConfig.azimuthDeg,
          hasBattery: Boolean(s.hasBattery),
          batteryCapacityKwh: s.batteryCapacityKwh ? Number(s.batteryCapacityKwh) : null,
          hasGridConnection: Boolean(s.hasGridConnection),
          wantsEstimate: s.wantsEstimate || "YES",
          budgetAmount: s.budgetAmount ? Number(s.budgetAmount) : null,
          isFarmerProvided: status === "YES",
        },
      });

      progress = await upsertOnboardingProgress(userId, {
        activeFarmId: savedFarm.id,
        currentStep: nextStep,
        completedSteps: markStepComplete ? [5] : [],
      });

      return NextResponse.json({ farm: savedFarm, onboardingProgress: progress });
    }

    // Step navigation update
    progress = await upsertOnboardingProgress(userId, { currentStep: nextStep });
    return NextResponse.json({ onboardingProgress: progress });
  } catch (err) {
    return apiError(err instanceof Error ? err.message : "Failed to save onboarding stage", 400);
  }
}
