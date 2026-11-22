import { NextResponse } from "next/server";
import { apiError } from "@/lib/api/http";
import { getSessionState } from "@/lib/auth/session";
import { listFarms } from "@/lib/db/repository";
import { getFarmBrainHistoryList } from "@/lib/services/farmbrain-service";

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
    return NextResponse.json({ farmId: null, history: [] });
  }

  const limitParam = Number(searchParams.get("limit") ?? 20);
  const limit = Number.isFinite(limitParam) ? Math.min(50, Math.max(1, limitParam)) : 20;
  const history = await getFarmBrainHistoryList({
    farmId,
    userId: state.user.id,
    limit,
  });

  return NextResponse.json({ farmId, history });
}
