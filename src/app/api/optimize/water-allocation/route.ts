import { NextResponse } from "next/server";
import { apiError, withApiRateLimit } from "@/lib/api/http";
import { getSessionState } from "@/lib/auth/session";
import { allocateWaterKKT } from "@/lib/engines/farmbrain-engine";
import { optimizeWaterAllocationSchema } from "@/lib/validation/schemas";

export async function POST(request: Request) {
  const limited = withApiRateLimit(request, "optimize_water_allocation", 40);
  if (limited) return limited;

  const state = await getSessionState();
  if (!state.user) return apiError("Authentication required", 401);

  const raw = await request.json().catch(() => ({}));
  const parsed = optimizeWaterAllocationSchema.safeParse(raw);
  if (!parsed.success) {
    return apiError("Invalid allocation optimization payload", 400, parsed.error.flatten());
  }

  const allocations = allocateWaterKKT(parsed.data.availableLitres, parsed.data.plots);
  return NextResponse.json({
    availableLitres: parsed.data.availableLitres,
    allocations,
  });
}
