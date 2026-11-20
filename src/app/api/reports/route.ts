import { NextResponse } from "next/server";
import { apiError, withApiRateLimit } from "@/lib/api/http";
import { getSessionState } from "@/lib/auth/session";
import {
  getAnalysisBundle,
  getFarmById,
  listReports,
  saveAnalysisBundle,
  saveReport,
} from "@/lib/db/repository";
import {
  buildFeasibilityReport,
  runCompleteFarmAnalysis,
} from "@/lib/services/analysis-orchestrator";

export async function GET(request: Request) {
  const limited = withApiRateLimit(request, "reports_get", 60);
  if (limited) return limited;

  const state = await getSessionState();
  if (!state.user) return apiError("Authentication required", 401);

  const { searchParams } = new URL(request.url);
  const farmId = searchParams.get("farmId") || undefined;
  return NextResponse.json({ reports: await listReports(farmId, state.user.id) });
}

export async function POST(request: Request) {
  const limited = withApiRateLimit(request, "reports_post", 20);
  if (limited) return limited;

  const state = await getSessionState();
  if (!state.user) return apiError("Authentication required", 401);

  try {
    const body = await request.json();
    const farmId = String(body.farmId || "");
    if (!farmId) return apiError("farmId is required", 400);

    const farm = await getFarmById(farmId, state.user.id);
    if (!farm) return apiError("Farm not found", 404);

    let bundle = body.refresh ? null : getAnalysisBundle(farmId);
    if (!bundle) {
      bundle = await runCompleteFarmAnalysis(farm);
      saveAnalysisBundle(bundle);
    }

    const report = buildFeasibilityReport(farm, bundle);
    await saveReport(report);
    return NextResponse.json({ report, analysis: bundle }, { status: 201 });
  } catch (err) {
    return apiError(
      err instanceof Error ? err.message : "Report generation failed",
      500
    );
  }
}
