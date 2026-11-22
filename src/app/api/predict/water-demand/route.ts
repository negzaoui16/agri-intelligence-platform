import { NextResponse } from "next/server";
import { apiError, withApiRateLimit } from "@/lib/api/http";
import { getSessionState } from "@/lib/auth/session";
import { predictOptimalDailyWaterDemandMm } from "@/lib/engines/farmbrain-engine";
import { predictWaterDemandSchema } from "@/lib/validation/schemas";

export async function POST(request: Request) {
  const limited = withApiRateLimit(request, "predict_water_demand", 40);
  if (limited) return limited;

  const state = await getSessionState();
  if (!state.user) return apiError("Authentication required", 401);

  const raw = await request.json().catch(() => ({}));
  const parsed = predictWaterDemandSchema.safeParse(raw);
  if (!parsed.success) {
    return apiError("Invalid water demand prediction request", 400, parsed.error.flatten());
  }

  const prediction = predictOptimalDailyWaterDemandMm(parsed.data);
  return NextResponse.json(prediction);
}
