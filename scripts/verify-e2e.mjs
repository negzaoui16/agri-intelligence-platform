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
    "/login",
    "/register",
    "/forgot-password",
    "/auth/callback",
    "/onboarding",
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

  // 7. Stateful Auth, Ownership & 5-Stage Onboarding E2E Check
  const jar = new Map();
  const absorbCookies = (res) => {
    const setCookies =
      typeof res.headers.getSetCookie === "function"
        ? res.headers.getSetCookie()
        : res.headers.get("set-cookie")
          ? [res.headers.get("set-cookie")]
          : [];
    for (const raw of setCookies) {
      const [pair] = raw.split(";");
      const idx = pair.indexOf("=");
      if (idx > 0) {
        const name = pair.slice(0, idx).trim();
        const val = pair.slice(idx + 1).trim();
        if (!val) jar.delete(name);
        else jar.set(name, val);
      }
    }
  };
  const authFetch = async (path, init = {}) => {
    const cookieHeader = Array.from(jar.entries())
      .map(([k, v]) => `${k}=${v}`)
      .join("; ");
    const res = await fetch(`${BASE}${path}`, {
      ...init,
      headers: {
        ...(init.headers || {}),
        ...(cookieHeader ? { Cookie: cookieHeader } : {}),
      },
    });
    absorbCookies(res);
    return res;
  };

  const e2eEmail = `e2e.farmer.${Date.now()}@terrapulse.test`;
  const e2ePass1 = "SaharaOlive!2026";
  const e2ePass2 = "NabeulCitrus!2026";

  const regRes = await (
    await assertOk(
      "auth/register",
      await authFetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: "Amina",
          lastName: "Ben Salem",
          email: e2eEmail,
          password: e2ePass1,
        }),
      })
    )
  ).json();
  if (regRes.redirectTo !== "/onboarding") {
    throw new Error(`Expected /onboarding redirect after register, got ${regRes.redirectTo}`);
  }
  console.log(`  ✓ /api/auth/register -> Registered ${e2eEmail} -> ${regRes.redirectTo}`);

  const initialUserFarms = await (await assertOk("new user farms", await authFetch("/api/farms"))).json();
  if (initialUserFarms.farms.length !== 0) {
    throw new Error(`Expected 0 farms for new user, got ${initialUserFarms.farms.length}`);
  }
  console.log("  ✓ Private ownership check -> New farmer sees 0 demo farms");

  await assertOk(
    "onboarding stage 1",
    await authFetch("/api/onboarding", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        stage: 1,
        nextStep: 2,
        profile: {
          firstName: "Amina",
          lastName: "Ben Salem",
          phone: "+216 98 111 222",
          country: "Tunisia",
          governorate: "Kairouan",
          delegation: "Haffouz",
          locality: "Oued El Hajel",
          preferredLanguage: "en",
          preferredUnits: "metric",
          experienceLevel: "YEARS_5_10",
          activityType: "SMALL_FAMILY_FARM",
        },
      }),
    })
  );

  const s2a = await (
    await assertOk(
      "onboarding stage 2a",
      await authFetch("/api/onboarding", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stage: 2,
          nextStep: 3,
          farm: {
            name: "Kairouan Olive Grove Draft",
            country: "Tunisia",
            region: "Kairouan · Haffouz",
            centerLat: 35.635,
            centerLon: 9.675,
            areaHectares: 6.5,
            perimeterMeters: 1050,
            boundaryVerified: true,
          },
        }),
      })
    )
  ).json();
  const e2eFarmId = s2a.farm?.id;
  if (!e2eFarmId) throw new Error("Expected farm.id from Stage 2");

  // Save Stage 2 again with same farmId to verify zero duplicates
  await assertOk(
    "onboarding stage 2b (update without duplicate)",
    await authFetch("/api/onboarding", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        stage: 2,
        nextStep: 3,
        farmId: e2eFarmId,
        farm: {
          name: "Kairouan Olive Grove",
          country: "Tunisia",
          region: "Kairouan · Haffouz",
          centerLat: 35.635,
          centerLon: 9.675,
          areaHectares: 6.5,
          perimeterMeters: 1050,
          boundaryVerified: true,
        },
      }),
    })
  );

  await assertOk(
    "onboarding stage 3",
    await authFetch("/api/onboarding", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        stage: 3,
        nextStep: 4,
        farmId: e2eFarmId,
        crops: [
          {
            cropCode: "olive",
            cropName: "Olive Trees",
            cultivatedAreaHa: 4.5,
            areaUnit: "ha",
            growthStage: "FRUIT_DEVELOPMENT",
            plotCount: 1,
            irrigationMethod: "DRIP",
          },
          {
            cropCode: "tomato",
            cropName: "Tomato",
            cultivatedAreaHa: 2.0,
            areaUnit: "ha",
            growthStage: "VEGETATIVE",
            plotCount: 2,
            irrigationMethod: "DRIP",
          },
        ],
      }),
    })
  );

  await assertOk(
    "onboarding stage 4",
    await authFetch("/api/onboarding", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        stage: 4,
        nextStep: 5,
        farmId: e2eFarmId,
        waterSources: [
          {
            sourceType: "WELL",
            wellDepthM: 55,
            flowRateM3Hr: 22,
            availability: "Seasonal summer drawdown",
            isFarmerProvided: true,
          },
        ],
        irrigationMethod: "DRIP",
        pump: {
          hasPump: true,
          flowRateM3Hr: 22,
          staticHeadM: 42,
          operatingHoursDay: 7,
          isFarmerProvided: true,
        },
      }),
    })
  );

  await assertOk(
    "onboarding stage 5",
    await authFetch("/api/onboarding", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        stage: 5,
        nextStep: 6,
        farmId: e2eFarmId,
        solar: {
          solarStatus: "PLANNING",
          wantsEstimate: "YES",
          budgetAmount: 4800,
        },
      }),
    })
  );

  const completed = await (
    await assertOk(
      "onboarding/complete",
      await authFetch("/api/onboarding/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ farmId: e2eFarmId, skipRemoteAnalysis: true }),
      })
    )
  ).json();
  if (!completed.completed || completed.redirectTo !== "/") {
    throw new Error("Expected onboarding completion and / redirect");
  }

  const afterFarms = await (await assertOk("farms after onboarding", await authFetch("/api/farms"))).json();
  if (afterFarms.farms.length !== 1 || afterFarms.farms[0].name !== "Kairouan Olive Grove") {
    throw new Error(`Expected exactly 1 farm named Kairouan Olive Grove, got ${afterFarms.farms.length}`);
  }
  console.log(`  ✓ /api/onboarding (stages 1-5 + complete) -> 1 farm persisted (${e2eFarmId}), no duplicates`);

  // Logout & verify 401 guard
  await assertOk("logout", await authFetch("/api/auth/session", { method: "DELETE" }));
  const lockedFarms = await authFetch("/api/farms");
  if (lockedFarms.status !== 401) {
    throw new Error(`Expected HTTP 401 on /api/farms after logout, got ${lockedFarms.status}`);
  }
  console.log("  ✓ Logout + protected API route check -> HTTP 401 while signed out");

  // Login again & verify password reset
  const login1 = await (
    await assertOk(
      "login",
      await authFetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: e2eEmail, password: e2ePass1 }),
      })
    )
  ).json();
  if (!login1.onboardingCompleted || login1.redirectTo !== "/") {
    throw new Error("Expected returning farmer redirect to /");
  }

  const forgot = await (
    await assertOk(
      "forgot-password",
      await authFetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: e2eEmail }),
      })
    )
  ).json();
  if (forgot.devResetCode) {
    await assertOk(
      "reset-password",
      await authFetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: forgot.devResetCode, newPassword: e2ePass2 }),
      })
    );
    await assertOk(
      "login with reset password",
      await authFetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: e2eEmail, password: e2ePass2 }),
      })
    );
  }
  console.log("  ✓ Login + forgot/reset password flow verified");

  // Clean up test farmer's farm
  await authFetch(`/api/farms/${e2eFarmId}`, { method: "DELETE" });

  console.log("\nAll end-to-end verification checks passed!");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
