import { NextResponse } from "next/server";
import { apiError, withApiRateLimit } from "@/lib/api/http";
import { getSessionState } from "@/lib/auth/session";
import { getFarmById, revokeSensorDevice } from "@/lib/db/repository";

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string; deviceId: string }> }
) {
  const limited = withApiRateLimit(request, "farm_devices_delete", 30);
  if (limited) return limited;

  const state = await getSessionState();
  if (!state.user) return apiError("Authentication required", 401);

  const { id, deviceId } = await context.params;
  const farm = await getFarmById(id, state.user.id);
  if (!farm) return apiError("Farm not found", 404);

  const revoked = await revokeSensorDevice({
    farmId: farm.id,
    deviceId,
    ownerUserId: state.user.id,
  });

  if (!revoked) {
    return apiError("Sensor device not found or already revoked", 404);
  }

  return NextResponse.json({ revoked: true, deviceId });
}
