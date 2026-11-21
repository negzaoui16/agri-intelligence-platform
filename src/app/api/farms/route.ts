import { NextResponse } from "next/server";
import { apiError, withApiRateLimit } from "@/lib/api/http";
import { getSessionState } from "@/lib/auth/session";
import { listFarms, upsertFarm } from "@/lib/db/repository";
import { createFarmSchema } from "@/lib/validation/schemas";

export async function GET(request: Request) {
  const limited = withApiRateLimit(request, "farms_get", 120);
  if (limited) return limited;

  const state = await getSessionState();
  if (!state.user) return apiError("Authentication required", 401);
  const farms = await listFarms(state.user.id);
  return NextResponse.json({ farms });
}

export async function POST(request: Request) {
  const limited = withApiRateLimit(request, "farms_post", 40);
  if (limited) return limited;

  const state = await getSessionState();
  if (!state.user) return apiError("Authentication required", 401);

  try {
    const body = await request.json();
    const parsed = createFarmSchema.safeParse(body);
    if (!parsed.success) {
      return apiError("Validation error", 400, parsed.error.flatten());
    }

    const farm = await upsertFarm({
      ...parsed.data,
      userId: state.user.id,
      boundary: parsed.data.boundary ?? null,
      pins: parsed.data.pins?.map((p) => ({
        id: p.id || "",
        label: p.label,
        role: p.role,
        latitude: p.latitude,
        longitude: p.longitude,
        elevationM: p.elevationM ?? null,
        notes: p.notes ?? null,
      })),
      crops: parsed.data.crops?.map((c, idx) => ({
        id: c.id || `crop_${Date.now()}_${idx}`,
        farmId: parsed.data.id || "",
        cropCode: c.cropCode,
        cropName: c.cropName,
        cultivatedAreaHa: c.cultivatedAreaHa,
        areaUnit: c.areaUnit,
        plantingDate: c.plantingDate ?? null,
        growthStage: c.growthStage ?? null,
        plotCount: c.plotCount,
        plantingDensity: c.plantingDensity ?? null,
        irrigationMethod: c.irrigationMethod,
      })),
      farmerWaterSources: parsed.data.farmerWaterSources?.map((ws, idx) => ({
        id: ws.id || `fws_${Date.now()}_${idx}`,
        farmId: parsed.data.id || "",
        sourceType: ws.sourceType,
        latitude: ws.latitude ?? null,
        longitude: ws.longitude ?? null,
        distanceMeters: ws.distanceMeters ?? null,
        availability: ws.availability ?? null,
        wellDepthM: ws.wellDepthM ?? null,
        flowRateM3Hr: ws.flowRateM3Hr ?? null,
        waterQualityNotes: ws.waterQualityNotes ?? null,
        isFarmerProvided: ws.isFarmerProvided,
      })),
    });

    return NextResponse.json({ farm }, { status: 201 });
  } catch (err) {
    return apiError(
      err instanceof Error ? err.message : "Failed to save property",
      500
    );
  }
}
