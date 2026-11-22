import { NextResponse } from "next/server";
import { apiError, withApiRateLimit } from "@/lib/api/http";
import { getSessionState } from "@/lib/auth/session";
import {
  getFarmById,
  getFarmSensorsBundle,
  getLatestFarmBrainAnalysis,
  saveAnalysisBundle,
  saveFarmBrainAnalysis,
  upsertFarm,
} from "@/lib/db/repository";
import { computeFarmBrainAnalysis } from "@/lib/engines/farmbrain-engine";
import { runCompleteFarmAnalysis } from "@/lib/services/analysis-orchestrator";
import { coordinatesSchema } from "@/lib/validation/schemas";

export async function POST(request: Request) {
  const limited = withApiRateLimit(request, "analyze", 20);
  if (limited) return limited;

  const state = await getSessionState();
  if (!state.user) return apiError("Authentication required", 401);

  try {
    const body = await request.json();
    if (body.farmId) {
      const farm = await getFarmById(String(body.farmId), state.user.id);
      if (!farm) return apiError("Farm not found", 404);
      const analysis = await runCompleteFarmAnalysis(farm);
      // Persist updated elevation back onto farm record
      await upsertFarm({
        id: farm.id,
        userId: state.user.id,
        name: farm.name,
        centerLat: farm.centerLat,
        centerLon: farm.centerLon,
        elevationM: analysis.elevation.farmElevationM,
      });
      saveAnalysisBundle(analysis);
      try {
        const sensors = await getFarmSensorsBundle(farm.id, state.user.id).catch(() => null);
        const prevBrain = await getLatestFarmBrainAnalysis(farm.id, state.user.id).catch(() => null);
        const farmBrain = computeFarmBrainAnalysis({
          farm,
          analysis,
          sensors,
          previousVersion: prevBrain?.version ?? 0,
        });
        await saveFarmBrainAnalysis(farmBrain);
      } catch {
        // Non-fatal
      }
      return NextResponse.json({ analysis });
    }

    const coords = coordinatesSchema.safeParse({
      latitude: body.latitude,
      longitude: body.longitude,
    });
    if (!coords.success) {
      return apiError("Provide a valid farmId or latitude/longitude", 400);
    }

    const adHocFarm = await upsertFarm({
      id: `adhoc_${Date.now()}`,
      userId: state.user.id,
      name: body.name || `Field Site (${coords.data.latitude.toFixed(3)}, ${coords.data.longitude.toFixed(3)})`,
      centerLat: coords.data.latitude,
      centerLon: coords.data.longitude,
      areaHectares: Number(body.areaHectares || 5),
      primaryCropCode: body.cropCode || "tomato",
    });

    const analysis = await runCompleteFarmAnalysis(adHocFarm);
    saveAnalysisBundle(analysis);
    return NextResponse.json({ farm: adHocFarm, analysis });
  } catch (err) {
    return apiError(
      err instanceof Error ? err.message : "Full analysis failed",
      502
    );
  }
}
