import { NextResponse } from "next/server";
import { apiError, withApiRateLimit } from "@/lib/api/http";
import { getFarmById } from "@/lib/db/repository";
import { fetchNearbyWaterSources } from "@/lib/services/water-sources";
import { coordinatesSchema } from "@/lib/validation/schemas";

export async function GET(request: Request) {
  const limited = withApiRateLimit(request, "water_sources", 30);
  if (limited) return limited;

  const { searchParams } = new URL(request.url);
  const parsed = coordinatesSchema.safeParse({
    latitude: searchParams.get("lat"),
    longitude: searchParams.get("lon"),
  });
  if (!parsed.success) {
    return apiError("Invalid latitude or longitude", 400, parsed.error.flatten());
  }

  const radius = Number(searchParams.get("radius") || 10000);
  const farmId = searchParams.get("farmId");
  const farm = farmId ? await getFarmById(farmId) : null;

  try {
    const waterSources = await fetchNearbyWaterSources(
      parsed.data.latitude,
      parsed.data.longitude,
      Number.isFinite(radius) ? radius : 10000,
      farm?.boundary
    );
    return NextResponse.json({ waterSources });
  } catch (err) {
    return apiError(
      err instanceof Error ? err.message : "Water source discovery failed",
      502
    );
  }
}
