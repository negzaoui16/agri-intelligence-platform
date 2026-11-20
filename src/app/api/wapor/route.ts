import { NextResponse } from "next/server";
import { apiError, withApiRateLimit } from "@/lib/api/http";
import { fetchWaPORData } from "@/lib/services/wapor";
import { coordinatesSchema } from "@/lib/validation/schemas";

export async function GET(request: Request) {
  const limited = withApiRateLimit(request, "wapor", 30);
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
    const wapor = await fetchWaPORData(parsed.data.latitude, parsed.data.longitude);
    return NextResponse.json({ wapor });
  } catch (err) {
    return apiError(
      err instanceof Error ? err.message : "FAO WaPOR query failed",
      502
    );
  }
}
