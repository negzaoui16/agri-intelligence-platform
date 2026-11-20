import { NextResponse } from "next/server";
import { apiError, withApiRateLimit } from "@/lib/api/http";
import { getActiveSessionUser } from "@/lib/auth/session";
import { listFarms, upsertFarm } from "@/lib/db/repository";
import { createFarmSchema } from "@/lib/validation/schemas";

export async function GET(request: Request) {
  const limited = withApiRateLimit(request, "farms_get", 120);
  if (limited) return limited;

  const user = await getActiveSessionUser();
  const farms = await listFarms(user.id);
  return NextResponse.json({ farms });
}

export async function POST(request: Request) {
  const limited = withApiRateLimit(request, "farms_post", 40);
  if (limited) return limited;

  try {
    const body = await request.json();
    const parsed = createFarmSchema.safeParse(body);
    if (!parsed.success) {
      return apiError("Validation error", 400, parsed.error.flatten());
    }

    const user = await getActiveSessionUser();
    const farm = await upsertFarm({
      ...parsed.data,
      userId: user.id,
      boundary: parsed.data.boundary ?? null,
      pins: parsed.data.pins?.map((p) => ({
        id: p.id || "",
        label: p.label,
        role: p.role,
        latitude: p.latitude,
        longitude: p.longitude,
        elevationM: p.elevationM ?? null,
        notes: p.notes ?? null,
      })),
    });

    return NextResponse.json({ farm }, { status: 201 });
  } catch (err) {
    return apiError(
      err instanceof Error ? err.message : "Failed to save property",
      500
    );
  }
}
