import { NextResponse } from "next/server";
import { apiError, withApiRateLimit } from "@/lib/api/http";
import { fetchPVGISSolarAnalysis } from "@/lib/services/pvgis";
import { coordinatesSchema, solarConfigInputSchema } from "@/lib/validation/schemas";

export async function GET(request: Request) {
  const limited = withApiRateLimit(request, "solar", 45);
  if (limited) return limited;

  const { searchParams } = new URL(request.url);
  const coords = coordinatesSchema.safeParse({
    latitude: searchParams.get("lat"),
    longitude: searchParams.get("lon"),
  });
  if (!coords.success) {
    return apiError("Invalid coordinates", 400, coords.error.flatten());
  }

  const cfg = solarConfigInputSchema.safeParse({
    capacityKwp: searchParams.get("capacity") ?? 8,
    tiltDeg: searchParams.get("tilt") ?? 30,
    azimuthDeg: searchParams.get("azimuth") ?? 0,
    mountingType: searchParams.get("mounting") ?? "free",
    systemLossPct: searchParams.get("loss") ?? 14,
    optimizeAngles: searchParams.get("optimal") === "true",
  });
  if (!cfg.success) {
    return apiError("Invalid solar configuration", 400, cfg.error.flatten());
  }

  try {
    const solar = await fetchPVGISSolarAnalysis({
      latitude: coords.data.latitude,
      longitude: coords.data.longitude,
      ...cfg.data,
    });
    return NextResponse.json({ solar });
  } catch (err) {
    return apiError(
      err instanceof Error ? err.message : "PVGIS solar simulation failed",
      502
    );
  }
}
