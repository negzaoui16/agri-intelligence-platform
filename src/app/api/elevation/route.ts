import { NextResponse } from "next/server";
import { apiError, withApiRateLimit } from "@/lib/api/http";
import { fetchElevationProfile } from "@/lib/services/elevation";
import { coordinatesSchema } from "@/lib/validation/schemas";

export async function GET(request: Request) {
  const limited = withApiRateLimit(request, "elevation", 60);
  if (limited) return limited;

  const { searchParams } = new URL(request.url);
  const parsed = coordinatesSchema.safeParse({
    latitude: searchParams.get("lat"),
    longitude: searchParams.get("lon"),
  });
  if (!parsed.success) {
    return apiError("Invalid latitude or longitude", 400, parsed.error.flatten());
  }

  try {
    const elevation = await fetchElevationProfile(
      parsed.data.latitude,
      parsed.data.longitude
    );
    return NextResponse.json({ elevation });
  } catch (err) {
    return apiError(
      err instanceof Error ? err.message : "Elevation service unavailable",
      502
    );
  }
}
