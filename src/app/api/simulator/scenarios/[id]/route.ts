import { NextResponse } from "next/server";
import { apiError, withApiRateLimit } from "@/lib/api/http";
import { getSessionState } from "@/lib/auth/session";
import {
  deleteSimulationScenario,
  getSimulationScenario,
  saveSimulationScenario,
} from "@/lib/db/repository";
import { updateSimulationScenarioSchema } from "@/lib/validation/schemas";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const state = await getSessionState();
  if (!state.user) return apiError("Authentication required", 401);

  const { id } = await context.params;
  const scenario = await getSimulationScenario(id, state.user.id);
  if (!scenario) return apiError("Scenario not found", 404);

  return NextResponse.json({ scenario });
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const limited = withApiRateLimit(request, "simulator_update", 30);
  if (limited) return limited;

  const state = await getSessionState();
  if (!state.user) return apiError("Authentication required", 401);

  const { id } = await context.params;
  const existing = await getSimulationScenario(id, state.user.id);
  if (!existing) return apiError("Scenario not found", 404);

  const raw = await request.json().catch(() => ({}));
  const parsed = updateSimulationScenarioSchema.safeParse(raw);
  if (!parsed.success) {
    return apiError("Invalid scenario update payload", 400, parsed.error.flatten());
  }

  const updated = {
    ...existing,
    name: parsed.data.name ?? existing.name,
    inputs: parsed.data.inputs ?? existing.inputs,
    scenarioType: parsed.data.inputs?.scenarioType ?? existing.scenarioType,
    isArchived: parsed.data.isArchived ?? existing.isArchived,
    updatedAt: new Date().toISOString(),
  };

  await saveSimulationScenario(updated);
  return NextResponse.json({ scenario: updated });
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const limited = withApiRateLimit(request, "simulator_delete", 30);
  if (limited) return limited;

  const state = await getSessionState();
  if (!state.user) return apiError("Authentication required", 401);

  const { id } = await context.params;
  const ok = await deleteSimulationScenario(id, state.user.id);
  if (!ok) return apiError("Scenario not found", 404);

  return NextResponse.json({ deleted: true, id });
}
