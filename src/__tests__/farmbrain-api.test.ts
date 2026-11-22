import { beforeEach, describe, expect, it } from "vitest";
import { GET as getOverviewRoute } from "@/app/api/farmbrain/overview/route";
import { POST as analyzeBrainRoute } from "@/app/api/farmbrain/analyze/route";
import { POST as recalculateBrainRoute } from "@/app/api/farmbrain/recalculate/route";
import { GET as getSavingsRoute } from "@/app/api/farmbrain/savings/route";
import { POST as createScenarioRoute, GET as listScenariosRoute } from "@/app/api/simulator/scenarios/route";
import { DELETE as deleteScenarioRoute } from "@/app/api/simulator/scenarios/[id]/route";
import { POST as compareScenariosRoute } from "@/app/api/simulator/compare/route";
import { POST as predictSoilRoute } from "@/app/api/predict/soil-moisture/route";
import { POST as predictWaterRoute } from "@/app/api/predict/water-demand/route";
import { POST as optimizeAllocRoute } from "@/app/api/optimize/water-allocation/route";
import { POST as simCropRoute } from "@/app/api/simulate/crop-growth/route";
import { resetLocalDbForTests, readLocalDb } from "@/lib/db/local-store";

describe("FarmBrain & Simulator API Routes", () => {
  beforeEach(() => {
    resetLocalDbForTests();
  });

  it("serves FarmBrain overview, analyze, savings, and recalculate routes", async () => {
    const resAnalyze = await analyzeBrainRoute(
      new Request("http://localhost:3000/api/farmbrain/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-forwarded-for": "10.1.0.1" },
        body: JSON.stringify({
          farmId: "farm_mitidja_01",
          waterTariffTndPerM3: 0.28,
        }),
      })
    );
    expect(resAnalyze.status).toBe(200);
    const analyzeJson = await resAnalyze.json();
    expect(analyzeJson.analysis.farmId).toBe("farm_mitidja_01");
    expect(analyzeJson.analysis.savings.waterSavedM3Yr).toBeGreaterThan(0);

    const resOverview = await getOverviewRoute(
      new Request("http://localhost:3000/api/farmbrain/overview?farmId=farm_mitidja_01")
    );
    expect(resOverview.status).toBe(200);
    const overJson = await resOverview.json();
    expect(overJson.analysis.id).toBe(analyzeJson.analysis.id);
    expect(overJson.mlMetadata.splitStrategy).toBe("chronological_80_20");

    const resSavings = await getSavingsRoute(
      new Request("http://localhost:3000/api/farmbrain/savings?farmId=farm_mitidja_01")
    );
    expect(resSavings.status).toBe(200);
    const savJson = await resSavings.json();
    expect(savJson.savings.waterCostSavedTndYr).toBeGreaterThan(0);

    const resRecalc = await recalculateBrainRoute(
      new Request("http://localhost:3000/api/farmbrain/recalculate", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-forwarded-for": "10.1.0.2" },
        body: JSON.stringify({
          farmId: "farm_mitidja_01",
          waterTariffTndPerM3: 0.45,
        }),
      })
    );
    expect(resRecalc.status).toBe(200);
    const recalcJson = await resRecalc.json();
    expect(recalcJson.analysis.version).toBe(2);
    expect(recalcJson.analysis.savings.waterCostSavedTndYr).toBeGreaterThan(
      savJson.savings.waterCostSavedTndYr
    );
  });

  it("creates, runs, compares, and deletes isolated simulation scenarios without mutating real farm data", async () => {
    const farmBefore = JSON.stringify(
      readLocalDb().farms.find((f) => f.id === "farm_mitidja_01")
    );

    const res1 = await createScenarioRoute(
      new Request("http://localhost:3000/api/simulator/scenarios", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-forwarded-for": "10.1.0.3" },
        body: JSON.stringify({
          farmId: "farm_mitidja_01",
          name: "Dry week 2000L",
          inputs: { scenarioType: "WATER_SHORTAGE", availableWaterLitres: 2000 },
        }),
      })
    );
    expect(res1.status).toBe(201);
    const s1 = (await res1.json()).scenario;

    const res2 = await createScenarioRoute(
      new Request("http://localhost:3000/api/simulator/scenarios", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-forwarded-for": "10.1.0.4" },
        body: JSON.stringify({
          farmId: "farm_mitidja_01",
          name: "AI timing test",
          inputs: { scenarioType: "IRRIGATION_STRATEGY", strategy: "AI_OPTIMIZED" },
        }),
      })
    );
    expect(res2.status).toBe(201);
    const s2 = (await res2.json()).scenario;

    const listRes = await listScenariosRoute(
      new Request("http://localhost:3000/api/simulator/scenarios?farmId=farm_mitidja_01")
    );
    expect(listRes.status).toBe(200);
    expect((await listRes.json()).scenarios.length).toBe(2);

    const compRes = await compareScenariosRoute(
      new Request("http://localhost:3000/api/simulator/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-forwarded-for": "10.1.0.5" },
        body: JSON.stringify({
          farmId: "farm_mitidja_01",
          scenarioIds: [s1.id, s2.id],
        }),
      })
    );
    expect(compRes.status).toBe(200);
    expect((await compRes.json()).comparison.scenarios.length).toBe(2);

    const delRes = await deleteScenarioRoute(
      new Request(`http://localhost:3000/api/simulator/scenarios/${s1.id}`, {
        method: "DELETE",
        headers: { "x-forwarded-for": "10.1.0.6" },
      }),
      { params: Promise.resolve({ id: s1.id }) }
    );
    expect(delRes.status).toBe(200);

    // Real farm profile must remain bit-for-bit untouched
    const farmAfter = JSON.stringify(
      readLocalDb().farms.find((f) => f.id === "farm_mitidja_01")
    );
    expect(farmAfter).toBe(farmBefore);
  });

  it("exposes direct predict, optimize, and crop simulation endpoints", async () => {
    const rSm = await predictSoilRoute(
      new Request("http://localhost:3000/api/predict/soil-moisture", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-forwarded-for": "10.1.0.7" },
        body: JSON.stringify({ farmId: "farm_mitidja_01" }),
      })
    );
    expect(rSm.status).toBe(200);
    expect((await rSm.json()).forecast.length).toBe(7);

    const rWd = await predictWaterRoute(
      new Request("http://localhost:3000/api/predict/water-demand", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-forwarded-for": "10.1.0.8" },
        body: JSON.stringify({
          soilMoisturePct: 34,
          tempMaxC: 33,
          humidityPct: 40,
          rainMm: 0,
          et0Mm: 6.2,
          kc: 1.05,
        }),
      })
    );
    expect(rWd.status).toBe(200);
    expect((await rWd.json()).recommendedIrrigationMm).toBeGreaterThan(0);

    const rOpt = await optimizeAllocRoute(
      new Request("http://localhost:3000/api/optimize/water-allocation", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-forwarded-for": "10.1.0.9" },
        body: JSON.stringify({
          availableLitres: 2500,
          plots: [
            {
              plotId: "p1",
              cropCode: "tomato",
              cropName: "Tomato",
              areaHa: 1.2,
              growthStage: "FLOWERING",
              dailyNeedLitres: 2500,
              priorityWeight: 2.0,
              ky: 1.05,
            },
            {
              plotId: "p2",
              cropCode: "olive",
              cropName: "Olive",
              areaHa: 1.2,
              growthStage: "LATE",
              dailyNeedLitres: 2500,
              priorityWeight: 0.7,
              ky: 0.7,
            },
          ],
        }),
      })
    );
    expect(rOpt.status).toBe(200);
    const allocs = (await rOpt.json()).allocations;
    expect(allocs[0].allocatedLitresDay).toBeGreaterThan(allocs[1].allocatedLitresDay);

    const rCrop = await simCropRoute(
      new Request("http://localhost:3000/api/simulate/crop-growth", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-forwarded-for": "10.1.0.10" },
        body: JSON.stringify({
          cropCode: "tomato",
          dailyEt0Mm: Array(90).fill(4.5),
          dailyRainMm: Array(90).fill(0.5),
          dailyIrrigationMm: Array(90).fill(4.0),
        }),
      })
    );
    expect(rCrop.status).toBe(200);
    expect((await rCrop.json()).simulation.modelUsed).toBe("FAO_AQUACROP_P66");
  });
});
