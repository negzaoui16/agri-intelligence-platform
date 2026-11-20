import { NextResponse } from "next/server";
import { apiError, withApiRateLimit } from "@/lib/api/http";
import { fetchHistoricalClimate, fetchWeatherAndForecast } from "@/lib/services/open-meteo";
import { coordinatesSchema } from "@/lib/validation/schemas";

export async function GET(request: Request) {
  const limited = withApiRateLimit(request, "weather", 60);
  if (limited) return limited;

  const { searchParams } = new URL(request.url);
  const parsed = coordinatesSchema.safeParse({
    latitude: searchParams.get("lat"),
    longitude: searchParams.get("lon"),
  });
  if (!parsed.success) {
    return apiError("Invalid latitude or longitude", 400, parsed.error.flatten());
  }

  const includeHistory = searchParams.get("history") !== "false";
  const frostMax = searchParams.get("frostC");
  const heatMin = searchParams.get("heatC");
  const windMax = searchParams.get("windKmh");

  try {
    const [forecast, history] = await Promise.all([
      fetchWeatherAndForecast(parsed.data.latitude, parsed.data.longitude, {
        frostMinTempC: frostMax ? Number(frostMax) : undefined,
        heatMaxTempC: heatMin ? Number(heatMin) : undefined,
        highWindKmh: windMax ? Number(windMax) : undefined,
      }),
      includeHistory
        ? fetchHistoricalClimate(parsed.data.latitude, parsed.data.longitude)
        : Promise.resolve(null),
    ]);

    return NextResponse.json({ forecast, history });
  } catch (err) {
    return apiError(
      err instanceof Error ? err.message : "Failed to fetch Open-Meteo data",
      502
    );
  }
}
