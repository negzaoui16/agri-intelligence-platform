import { NextResponse } from "next/server";
import { apiError, withApiRateLimit } from "@/lib/api/http";
import { getSessionState } from "@/lib/auth/session";
import {
  getAnalysisBundle,
  getFarmById,
  getFarmSensorsBundle,
  getSimulationScenario,
  saveSimulationScenario,
} from "@/lib/db/repository";
import { runFarmBrainSimulation } from "@/lib/engines/farmbrain-engine";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const limited = withApiRateLimit(request, "simulator_run", 40);
  if (limited) return limited;

  const state = await getSessionState();
  if (!state.user) return apiError("Authentication required", 401);

  const { id } = await context.params;
  const scenario = await getSimulationScenario(id, state.user.id);
  if (!scenario) return apiError("Scenario not found", 404);

  const farm = await getFarmById(scenario.farmId, state.user.id);
  if (!farm) return apiError("Farm not found", 404);

  const analysis = getAnalysisBundle(farm.id);
  const sensors = await getFarmSensorsBundle(farm.id, state.user.id).catch(() => null);
  const result = runFarmBrainSimulation({
    farm,
    analysis,
    sensors,
    inputs: scenario.inputs,
  });

  const nowIso = new Date().toISOString();
  const updated = {
    ...scenario,
    result,
    lastRunAt: nowIso,
    updatedAt: nowIso,
  };
  await saveSimulationScenario(updated);

  return NextResponse.json({ scenario: updated, result });
}
