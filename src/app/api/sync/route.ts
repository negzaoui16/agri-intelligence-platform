import { NextResponse } from "next/server";
import { apiError, withApiRateLimit } from "@/lib/api/http";
import { getSessionState } from "@/lib/auth/session";
import { listFarms, processSyncOperations } from "@/lib/db/repository";
import { syncOperationRequestSchema } from "@/lib/validation/schemas";

export async function POST(request: Request) {
  const limited = withApiRateLimit(request, "sync", 40);
  if (limited) return limited;

  const state = await getSessionState();
  if (!state.user) return apiError("Authentication required", 401);

  try {
    const body = await request.json();
    const parsed = syncOperationRequestSchema.safeParse(body);
    if (!parsed.success) {
      return apiError("Invalid sync payload", 400, parsed.error.flatten());
    }

    const results = await processSyncOperations(state.user.id, parsed.data.operations);
    const farms = await listFarms(state.user.id);

    return NextResponse.json({
      results,
      farms,
      syncedAt: new Date().toISOString(),
    });
  } catch (err) {
    return apiError(err instanceof Error ? err.message : "Sync failed", 500);
  }
}
