import { NextResponse } from "next/server";
import { apiError, withApiRateLimit } from "@/lib/api/http";
import { authenticateSensorDevice, ingestSensorReadings } from "@/lib/db/repository";
import { sensorReadingsPayloadSchema } from "@/lib/validation/schemas";

function extractBearerToken(request: Request): string | null {
  const header = request.headers.get("authorization");
  if (!header) return null;
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : null;
}

export async function POST(request: Request) {
  const limited = withApiRateLimit(request, "device_readings_post", 120);
  if (limited) return limited;

  const token = extractBearerToken(request);
  if (!token) {
    return apiError("Missing device Bearer key", 401);
  }

  const device = await authenticateSensorDevice(token);
  if (!device) {
    return apiError("Invalid or revoked device key", 401);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("Invalid JSON reading payload", 400);
  }

  const parsed = sensorReadingsPayloadSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("Invalid sensor reading payload", 400, parsed.error.flatten());
  }

  try {
    const saved = await ingestSensorReadings({
      device,
      readings: parsed.data,
    });
    return NextResponse.json(
      {
        accepted: saved.length,
        latestReading: saved[saved.length - 1] ?? null,
        readings: saved,
      },
      { status: 201 }
    );
  } catch (err) {
    return apiError(
      err instanceof Error ? err.message : "Failed to save sensor readings",
      500
    );
  }
}
