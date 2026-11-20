import { NextResponse } from "next/server";
import { apiError } from "@/lib/api/http";
import { getSessionState } from "@/lib/auth/session";
import {
  getFarmById,
  getOnboardingProgress,
  saveAnalysisBundle,
  saveReport,
  upsertFarm,
  upsertOnboardingProgress,
} from "@/lib/db/repository";
import {
  buildFeasibilityReport,
  runCompleteFarmAnalysis,
} from "@/lib/services/analysis-orchestrator";

export async function POST(request: Request) {
  const state = await getSessionState();
  if (!state.user) {
    return apiError("Authentication required", 401);
  }

  try {
    const body = await request.json().catch(() => ({}));
    const userId = state.user.id;
    const progress = getOnboardingProgress(userId);
    const farmId = body.farmId || progress.activeFarmId;
    if (!farmId) {
      return apiError("No farm created during onboarding yet.", 400);
    }

    const farm = await getFarmById(farmId, userId);
    if (!farm) {
      return apiError("Farm not found or forbidden.", 404);
    }

    const completedAt = new Date().toISOString();
    const updatedProgress = await upsertOnboardingProgress(userId, {
      activeFarmId: farm.id,
      currentStep: 6,
      completedSteps: [1, 2, 3, 4, 5],
      isCompleted: true,
      completedAt,
    });

    // Run initial scientific analysis gracefully (never block onboarding completion if external APIs fail)
    let analysisStatus: "COMPLETE" | "PENDING_EXTERNAL" = "COMPLETE";
    let pendingMessage: string | null = null;
    let analysis = null;

    if (!body.skipRemoteAnalysis) {
      try {
        analysis = await runCompleteFarmAnalysis(farm);
        saveAnalysisBundle(analysis);
        await upsertFarm({
          id: farm.id,
          userId,
          name: farm.name,
          centerLat: farm.centerLat,
          centerLon: farm.centerLon,
          elevationM: analysis.elevation.farmElevationM,
        });
        const report = buildFeasibilityReport(farm, analysis);
        saveReport(report);
      } catch (err) {
        analysisStatus = "PENDING_EXTERNAL";
        pendingMessage =
          err instanceof Error
            ? `Onboarding saved; external analysis pending (${err.message}).`
            : "Onboarding saved; external satellite/weather analysis pending.";
      }
    } else {
      analysisStatus = "PENDING_EXTERNAL";
      pendingMessage = "Offline mode: farm saved locally; remote analysis will run once online.";
    }

    return NextResponse.json({
      completed: true,
      onboardingProgress: updatedProgress,
      farm,
      analysisStatus,
      pendingMessage,
      analysis,
      redirectTo: "/",
    });
  } catch (err) {
    return apiError(err instanceof Error ? err.message : "Failed to complete onboarding", 500);
  }
}
