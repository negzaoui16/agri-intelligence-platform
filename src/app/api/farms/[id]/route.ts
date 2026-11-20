import { NextResponse } from "next/server";
import { apiError, withApiRateLimit } from "@/lib/api/http";
import { getActiveSessionUser } from "@/lib/auth/session";
import { deleteFarm, getAnalysisBundle, getFarmById, upsertFarm } from "@/lib/db/repository";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const limited = withApiRateLimit(request, "farm_detail", 120);
  if (limited) return limited;

  const { id } = await context.params;
  const farm = await getFarmById(id);
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

  try {
    const { id } = await context.params;
    const existing = await getFarmById(id);
    if (!existing) return apiError("Farm not found", 404);
    const body = await request.json();
    const user = await getActiveSessionUser();

    const updated = await upsertFarm({
      id,
      userId: user.id,
      name: body.name ?? existing.name,
      description: body.description ?? existing.description,
      country: body.country ?? existing.country,
      region: body.region ?? existing.region,
      centerLat: body.centerLat ?? existing.centerLat,
      centerLon: body.centerLon ?? existing.centerLon,
      elevationM: body.elevationM ?? existing.elevationM,
      areaHectares: body.areaHectares ?? existing.areaHectares,
      perimeterMeters: body.perimeterMeters ?? existing.perimeterMeters,
      boundary: body.boundary !== undefined ? body.boundary : existing.boundary,
      pins: body.pins ?? existing.pins,
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

  const { id } = await context.params;
  const deleted = await deleteFarm(id);
  if (!deleted) return apiError("Farm not found", 404);
  return NextResponse.json({ deleted: true, id });
}
