import { NextResponse } from "next/server";
import { apiError } from "@/lib/api/http";
import { getSessionState } from "@/lib/auth/session";
import { getTrainedMlMetadataSummary } from "@/lib/engines/farmbrain-engine";
import { listFarms } from "@/lib/db/repository";
import { getOrCreateFarmBrainOverview } from "@/lib/services/farmbrain-service";

export async function GET(request: Request) {
  const state = await getSessionState();
  if (!state.user) return apiError("Authentication required", 401);

  const { searchParams } = new URL(request.url);
  let farmId = searchParams.get("farmId");
  if (!farmId) {
    const farms = await listFarms(state.user.id);
    farmId = farms[0]?.id ?? null;
  }
  if (!farmId) {
    return apiError("No farm found for user", 404);
  }

  const analysis = await getOrCreateFarmBrainOverview({
    farmId,
    userId: state.user.id,
  });
  if (!analysis) {
    return apiError("Farm not found or forbidden", 404);
  }

  return NextResponse.json({
    analysis,
    mlMetadata: getTrainedMlMetadataSummary(),
  });
}
