import { NextResponse } from "next/server";
import { apiError, withApiRateLimit } from "@/lib/api/http";
import { getSessionState } from "@/lib/auth/session";
import { simulateCropGrowthTs } from "@/lib/engines/farmbrain-engine";
import { simulateCropGrowthSchema } from "@/lib/validation/schemas";

export async function POST(request: Request) {
  const limited = withApiRateLimit(request, "simulate_crop_growth", 40);
  if (limited) return limited;

  const state = await getSessionState();
  if (!state.user) return apiError("Authentication required", 401);

  const raw = await request.json().catch(() => ({}));
  const parsed = simulateCropGrowthSchema.safeParse(raw);
  if (!parsed.success) {
    return apiError("Invalid crop growth simulation payload", 400, parsed.error.flatten());
  }

  const simulation = simulateCropGrowthTs(parsed.data);
  return NextResponse.json({ simulation });
}
