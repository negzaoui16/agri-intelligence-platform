import { NextResponse } from "next/server";
import { apiError, withApiRateLimit } from "@/lib/api/http";
import { getSessionState } from "@/lib/auth/session";
import { runAndPersistFarmBrainAnalysis } from "@/lib/services/farmbrain-service";
import { farmBrainAnalyzeSchema } from "@/lib/validation/schemas";

export async function POST(request: Request) {
  const limited = withApiRateLimit(request, "farmbrain_recalculate", 30);
  if (limited) return limited;

  const state = await getSessionState();
  if (!state.user) return apiError("Authentication required", 401);

  const raw = await request.json().catch(() => ({}));
  const parsed = farmBrainAnalyzeSchema.safeParse(raw);
  if (!parsed.success) {
    return apiError("Invalid recalculate request", 400, parsed.error.flatten());
  }

  const analysis = await runAndPersistFarmBrainAnalysis({
    farmId: parsed.data.farmId,
    userId: state.user.id,
    waterTariffTndPerM3: parsed.data.waterTariffTndPerM3,
    electricityTariffTndPerKwh: parsed.data.electricityTariffTndPerKwh,
  });

  if (!analysis) {
    return apiError("Farm not found or forbidden", 404);
  }

  return NextResponse.json({ analysis });
}
