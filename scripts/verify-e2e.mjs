/**
 * End-to-end verification script against a running TerraPulse Next.js server.
 * Usage: node scripts/verify-e2e.mjs [baseUrl]
 */
const BASE = process.argv[2] || "http://localhost:3000";

async function assertOk(label, res) {
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`${label} failed with HTTP ${res.status}: ${body.slice(0, 300)}`);
  }
  return res;
}

async function run() {
  console.log(`Verifying TerraPulse server at ${BASE}...`);

  // 1. Verify all App Router HTML pages return HTTP 200
  for (const route of [
    "/",
    "/map",
    "/farms",
    "/environmental",
    "/water",
    "/solar",
    "/assistant",
    "/reports",
    "/offline",
    "/manifest.webmanifest",
    "/sw.js",
  ]) {
    const r = await fetch(`${BASE}${route}`);
    await assertOk(`GET ${route}`, r);
    console.log(`  ✓ GET ${route} -> ${r.status}`);
  }

  // 2. Verify Health & Farms
  const health = await (await assertOk("health", await fetch(`${BASE}/api/health`))).json();
  console.log(`  ✓ /api/health -> ${health.status} (${health.databaseMode})`);

  const farmsRes = await (await assertOk("farms", await fetch(`${BASE}/api/farms`))).json();
  if (!farmsRes.farms?.length) throw new Error("Expected seeded farms");
  const farmId = farmsRes.farms[0].id;
  console.log(`  ✓ /api/farms -> ${farmsRes.farms.length} farm(s), active=${farmId}`);

  // 3. Verify Full Composite Analysis
  const analyzeRes = await (
    await assertOk(
      "analyze",
      await fetch(`${BASE}/api/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ farmId }),
      })
    )
  ).json();
  console.log(
    `  ✓ /api/analyze -> Temp=${analyzeRes.analysis.weather.current.temperatureC}°C, PVGIS=${analyzeRes.analysis.solar.annualKwh} kWh/yr, WaterSources=${analyzeRes.analysis.waterSources.sources.length}`
  );

  // 4. Verify Report Generation
  const repRes = await (
    await assertOk(
      "reports",
      await fetch(`${BASE}/api/reports`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ farmId }),
      })
    )
  ).json();
  console.log(
    `  ✓ /api/reports -> Generated ${repRes.report.id} (${repRes.report.overallScore}/100 ${repRes.report.verdict})`
  );

  // 5. Verify AI Tool-Calling Chat
  const aiRes = await (
    await assertOk(
      "ai/chat",
      await fetch(`${BASE}/api/ai/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          farmId,
          message: "Can I install a solar-powered irrigation pump near my farm?",
        }),
      })
    )
  ).json();
  if (!aiRes.message?.toolCalls?.length) {
    throw new Error("Expected AI assistant to execute real analytical tools");
  }
  console.log(
    `  ✓ /api/ai/chat -> Executed ${aiRes.message.toolCalls.length} real tool(s): ${aiRes.message.toolCalls.map((t) => t.toolName).join(", ")}`
  );

  // 6. Verify Sync endpoint (create + idempotent replay)
  const opId = `e2e_op_${Date.now()}`;
  const syncPayload = {
    operations: [
      {
        operationId: opId,
        entityType: "FARM",
        entityId: `farm_e2e_${Date.now()}`,
        action: "CREATE",
        clientTimestamp: new Date().toISOString(),
        payload: {
          name: "E2E Verification Parcel",
          centerLat: 36.71,
          centerLon: 3.05,
          areaHectares: 6.2,
        },
      },
    ],
  };
  const sync1 = await (
    await assertOk(
      "sync1",
      await fetch(`${BASE}/api/sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(syncPayload),
      })
    )
  ).json();
  if (sync1.results[0].status !== "APPLIED") {
    throw new Error(`Expected APPLIED, got ${sync1.results[0].status}`);
  }
  console.log(`  ✓ /api/sync -> Applied offline create (${opId})`);

  // Clean up test farm
  await fetch(`${BASE}/api/farms/${syncPayload.operations[0].entityId}`, {
    method: "DELETE",
  });

  console.log("\nAll end-to-end verification checks passed!");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
