import { NextResponse } from "next/server";
import { apiError, withApiRateLimit } from "@/lib/api/http";
import { getSessionState } from "@/lib/auth/session";
import { deleteFarm, getAnalysisBundle, getFarmById, upsertFarm } from "@/lib/db/repository";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const limited = withApiRateLimit(request, "farm_detail", 120);
  if (limited) return limited;

  const state = await getSessionState();
  if (!state.user) return apiError("Authentication required", 401);

  const { id } = await context.params;
  const farm = await getFarmById(id, state.user.id);
  if (!farm) return apiError("Farm not found", 404);
  const analysis = getAnalysisBundle(id);
  return NextResponse.json({ farm, analysis });
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const limited = withApiRateLimit(request, "farm_patch", 60);
  if (limited) return limited;

  const state = await getSessionState();
  if (!state.user) return apiError("Authentication required", 401);

  try {
    const { id } = await context.params;
    const existing = await getFarmById(id, state.user.id);
    if (!existing) return apiError("Farm not found", 404);
    const body = await request.json();

    const updated = await upsertFarm({
      id,
      userId: state.user.id,
      name: body.name ?? existing.name,
      description: body.description ?? existing.description,
      country: body.country ?? existing.country,
      region: body.region ?? existing.region,
      governorate: body.governorate ?? existing.governorate,
      delegation: body.delegation ?? existing.delegation,
      locality: body.locality ?? existing.locality,
      centerLat: body.centerLat ?? existing.centerLat,
      centerLon: body.centerLon ?? existing.centerLon,
      elevationM: body.elevationM ?? existing.elevationM,
      areaHectares: body.areaHectares ?? existing.areaHectares,
      perimeterMeters: body.perimeterMeters ?? existing.perimeterMeters,
      boundary: body.boundary !== undefined ? body.boundary : existing.boundary,
      boundaryVerified: body.boundaryVerified ?? existing.boundaryVerified,
      pins: body.pins ?? existing.pins,
      crops: body.crops ?? existing.crops,
      farmerWaterSources: body.farmerWaterSources ?? existing.farmerWaterSources,
      primaryCropCode: body.primaryCropCode ?? existing.irrigationConfig.cropCode,
      plantingMonth: body.plantingMonth ?? existing.irrigationConfig.plantingMonth,
      soilTexture: body.soilTexture ?? existing.soilProfile.textureClass,
      irrigationMethod: body.irrigationMethod ?? existing.irrigationConfig.irrigationMethod,
      solarConfig: body.solarConfig ?? existing.solarConfig,
      pumpConfig: body.pumpConfig ?? existing.pumpConfig,
    });

    return NextResponse.json({ farm: updated });
  } catch (err) {
    return apiError(err instanceof Error ? err.message : "Failed to update farm", 400);
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const limited = withApiRateLimit(request, "farm_delete", 40);
  if (limited) return limited;

  const state = await getSessionState();
  if (!state.user) return apiError("Authentication required", 401);

  const { id } = await context.params;
  try {
    const deleted = await deleteFarm(id, state.user.id);
    if (!deleted) return apiError("Farm not found", 404);
    return NextResponse.json({ deleted: true, id });
  } catch {
    return apiError("Forbidden", 403);
  }
}
