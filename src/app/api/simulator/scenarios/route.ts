import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { apiError, withApiRateLimit } from "@/lib/api/http";
import { getSessionState } from "@/lib/auth/session";
import {
  getAnalysisBundle,
  getFarmById,
  getFarmSensorsBundle,
  listSimulationScenarios,
  saveSimulationScenario,
} from "@/lib/db/repository";
import { runFarmBrainSimulation } from "@/lib/engines/farmbrain-engine";
import { createSimulationScenarioSchema } from "@/lib/validation/schemas";
import type { SimulationScenarioRecord } from "@/types/agri";

export async function GET(request: Request) {
  const state = await getSessionState();
  if (!state.user) return apiError("Authentication required", 401);

  const { searchParams } = new URL(request.url);
  const farmId = searchParams.get("farmId") || undefined;
  const includeArchived = searchParams.get("includeArchived") === "true";

  const scenarios = await listSimulationScenarios(state.user.id, farmId, includeArchived);
  return NextResponse.json({ scenarios });
}

export async function POST(request: Request) {
  const limited = withApiRateLimit(request, "simulator_create", 30);
  if (limited) return limited;

  const state = await getSessionState();
  if (!state.user) return apiError("Authentication required", 401);

  const raw = await request.json().catch(() => ({}));
  const parsed = createSimulationScenarioSchema.safeParse(raw);
  if (!parsed.success) {
    return apiError("Invalid scenario payload", 400, parsed.error.flatten());
  }

  const farm = await getFarmById(parsed.data.farmId, state.user.id);
  if (!farm) return apiError("Farm not found or forbidden", 404);

  const nowIso = new Date().toISOString();
  let result = null;
  let lastRunAt: string | null = null;

  if (parsed.data.runImmediately) {
    const analysis = getAnalysisBundle(farm.id);
    const sensors = await getFarmSensorsBundle(farm.id, state.user.id).catch(() => null);
    result = runFarmBrainSimulation({
      farm,
      analysis,
      sensors,
      inputs: parsed.data.inputs,
    });
    lastRunAt = nowIso;
  }

  const record: SimulationScenarioRecord = {
    id: `sim_${Date.now()}_${crypto.randomBytes(3).toString("hex")}`,
    farmId: farm.id,
    userId: state.user.id,
    name: parsed.data.name,
    scenarioType: parsed.data.inputs.scenarioType,
    inputs: parsed.data.inputs,
    result,
    isArchived: false,
    createdAt: nowIso,
    updatedAt: nowIso,
    lastRunAt,
  };

  await saveSimulationScenario(record);
  return NextResponse.json({ scenario: record }, { status: 201 });
}
