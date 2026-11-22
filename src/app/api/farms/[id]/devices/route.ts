import { NextResponse } from "next/server";
import { apiError, withApiRateLimit } from "@/lib/api/http";
import { getSessionState } from "@/lib/auth/session";
import { createSensorDevice, getFarmById } from "@/lib/db/repository";
import { createSensorDeviceSchema } from "@/lib/validation/schemas";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const limited = withApiRateLimit(request, "farm_devices_post", 30);
  if (limited) return limited;

  const state = await getSessionState();
  if (!state.user) return apiError("Authentication required", 401);

  const { id } = await context.params;
  const farm = await getFarmById(id, state.user.id);
  if (!farm) return apiError("Farm not found", 404);

  let rawBody: unknown = {};
  try {
    const text = await request.text();
    rawBody = text.trim() ? JSON.parse(text) : {};
  } catch {
    return apiError("Invalid JSON body", 400);
  }

  const parsed = createSensorDeviceSchema.safeParse(rawBody);
  if (!parsed.success) {
    return apiError("Invalid sensor device request", 400, parsed.error.flatten());
  }

  try {
    const { device, deviceKey } = await createSensorDevice({
      farmId: farm.id,
      ownerUserId: state.user.id,
      name: parsed.data.name,
    });
    return NextResponse.json({ device, deviceKey, key: deviceKey }, { status: 201 });
  } catch (err) {
    return apiError(
      err instanceof Error ? err.message : "Failed to create sensor device",
      500
    );
  }
}
