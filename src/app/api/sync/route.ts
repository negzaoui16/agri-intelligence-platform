import { NextResponse } from "next/server";
import { apiError, withApiRateLimit } from "@/lib/api/http";
import { getActiveSessionUser } from "@/lib/auth/session";
import { listFarms, processSyncOperations } from "@/lib/db/repository";
import { syncOperationRequestSchema } from "@/lib/validation/schemas";

export async function POST(request: Request) {
  const limited = withApiRateLimit(request, "sync", 40);
  if (limited) return limited;

  try {
    const body = await request.json();
    const parsed = syncOperationRequestSchema.safeParse(body);
    if (!parsed.success) {
      return apiError("Invalid sync payload", 400, parsed.error.flatten());
    }

    const user = await getActiveSessionUser();
    const results = await processSyncOperations(user.id, parsed.data.operations);
    const farms = await listFarms(user.id);

    return NextResponse.json({
      results,
      farms,
      syncedAt: new Date().toISOString(),
    });
  } catch (err) {
    return apiError(err instanceof Error ? err.message : "Sync failed", 500);
  }
}
