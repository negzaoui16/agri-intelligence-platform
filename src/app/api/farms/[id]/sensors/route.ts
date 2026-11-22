import { NextResponse } from "next/server";
import { apiError, withApiRateLimit } from "@/lib/api/http";
import { getSessionState } from "@/lib/auth/session";
import { getFarmSensorsBundle, ingestOwnerBluetoothReading } from "@/lib/db/repository";
import { singleSensorReadingInputSchema } from "@/lib/validation/schemas";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const limited = withApiRateLimit(request, "farm_sensors_get", 120);
  if (limited) return limited;

  const state = await getSessionState();
  if (!state.user) return apiError("Authentication required", 401);

  const { id } = await context.params;
  const bundle = await getFarmSensorsBundle(id, state.user.id);
  if (!bundle) return apiError("Farm not found", 404);

  return NextResponse.json(bundle);
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const limited = withApiRateLimit(request, "farm_sensors_ble_post", 120);
  if (limited) return limited;

  const state = await getSessionState();
  if (!state.user) return apiError("Authentication required", 401);

  const { id } = await context.params;
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return apiError("Invalid JSON body", 400);
  }

  const deviceName =
    typeof body.deviceName === "string" && body.deviceName.trim()
      ? body.deviceName.trim().slice(0, 80)
      : undefined;
  const candidate =
    body.reading && typeof body.reading === "object" ? body.reading : body;

  const parsed = singleSensorReadingInputSchema.safeParse(candidate);
  if (!parsed.success) {
    return apiError("Invalid Bluetooth sensor reading", 400, parsed.error.flatten());
  }

  try {
    const bundle = await ingestOwnerBluetoothReading({
      farmId: id,
      ownerUserId: state.user.id,
      deviceName,
      reading: parsed.data,
    });
    return NextResponse.json(bundle, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to save Bluetooth reading";
    return apiError(message, message === "Farm not found" ? 404 : 500);
  }
}
