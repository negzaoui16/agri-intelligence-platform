import { NextResponse } from "next/server";
import { apiError, withApiRateLimit } from "@/lib/api/http";
import { getSessionState } from "@/lib/auth/session";
import { getFarmById, getSimulationScenario } from "@/lib/db/repository";
import { compareSimulationScenarios } from "@/lib/engines/farmbrain-engine";
import { compareScenariosSchema } from "@/lib/validation/schemas";
import type { SimulationScenarioRecord } from "@/types/agri";

export async function POST(request: Request) {
  const limited = withApiRateLimit(request, "simulator_compare", 30);
  if (limited) return limited;

  const state = await getSessionState();
  if (!state.user) return apiError("Authentication required", 401);

  const raw = await request.json().catch(() => ({}));
  const parsed = compareScenariosSchema.safeParse(raw);
  if (!parsed.success) {
    return apiError("Invalid comparison request", 400, parsed.error.flatten());
  }

  const farm = await getFarmById(parsed.data.farmId, state.user.id);
  if (!farm) return apiError("Farm not found or forbidden", 404);

  const resolved: SimulationScenarioRecord[] = [];
  for (const id of parsed.data.scenarioIds) {
    const s = await getSimulationScenario(id, state.user.id);
    if (s && s.farmId === farm.id) {
      resolved.push(s);
    }
  }

  if (resolved.length < 2) {
    return apiError("At least two saved scenarios for this farm are required", 400);
  }

  const comparison = compareSimulationScenarios(farm.id, resolved);
  return NextResponse.json({ comparison });
}
