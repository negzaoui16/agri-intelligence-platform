import { getFarmById } from "@/lib/db/repository";
import type {
  AIChatMessageRecord,
  AIToolExecutionTrace,
  DataSourceCitation,
  FarmRecord,
} from "@/types/agri";
import { AI_TOOL_DEFINITIONS, executeAITool } from "./tools";

const SYSTEM_PROMPT = `You are TerraPulse, a rigorous agricultural, hydrological, and solar engineering assistant.
You MUST obey these strict scientific accuracy rules:
1. NEVER invent environmental measurements, weather values, solar production numbers, or water sources.
2. ALWAYS invoke the available analytical tools to gather live or deterministic engine data before answering quantitative questions.
3. NEVER claim groundwater availability, borehole yield, or perennial surface water flow without hydrogeological or physical inspection — mapped rivers/wells in OpenStreetMap or HydroSHEDS only indicate geographic location, not operational availability.
4. NEVER guarantee agricultural suitability or crop yield; frame assessments probabilistically and identify missing site data (e.g., soil laboratory tests, water salinity EC, static water table depth, legal abstraction permits).
5. Explicitly distinguish Observed Data (weather, DEM elevation, WaPOR satellite, mapped OSM features), Modeled Data (PVGIS PV yield, FAO-56 ETc, hydraulic pump curve), and Assumptions (soil texture defaults, pipe diameter/length, emitter efficiency).
6. Cite the specific data sources and retrieval dates returned by the tools.`;

function deduplicateCitations(citations: DataSourceCitation[]): DataSourceCitation[] {
  const seen = new Map<string, DataSourceCitation>();
  for (const c of citations) {
    if (!seen.has(c.id)) seen.set(c.id, c);
  }
  return Array.from(seen.values());
}

async function runDeterministicToolAssistant(params: {
  message: string;
  farm: FarmRecord | null;
  compareFarm: FarmRecord | null;
}): Promise<AIChatMessageRecord> {
  const q = params.message.toLowerCase();
  const farm = params.farm;
  const lat = farm?.centerLat ?? Number(process.env.NEXT_PUBLIC_DEFAULT_LAT || 36.7525);
  const lon = farm?.centerLon ?? Number(process.env.NEXT_PUBLIC_DEFAULT_LON || 3.042);

  const traces: AIToolExecutionTrace[] = [];
  const allCitations: DataSourceCitation[] = [];

  const run = async (toolName: string, args: Record<string, unknown>) => {
    const res = await executeAITool(toolName, args);
    traces.push(res.trace);
    allCitations.push(...res.citations);
    return res.output as Record<string, unknown>;
  };

  // Location comparison workflow
  if (params.compareFarm && farm) {
    const [aRes, bRes] = await Promise.all([
      run("analyze_location", { latitude: farm.centerLat, longitude: farm.centerLon }),
      run("analyze_location", {
        latitude: params.compareFarm.centerLat,
        longitude: params.compareFarm.centerLon,
      }),
    ]);

    const aClin = aRes.climate as { annualPrecipMm: number; annualEt0Mm: number; aridityClass: string; aridityIndex: number };
    const bClin = bRes.climate as { annualPrecipMm: number; annualEt0Mm: number; aridityClass: string; aridityIndex: number };
    const aSol = aRes.solar as { annualKwh: number; specificYieldKwhPerKwp: number };
    const bSol = bRes.solar as { annualKwh: number; specificYieldKwhPerKwp: number };
    const aWat = aRes.waterSources as { nearestSource?: { name: string; distanceFromCentroidM: number; elevationDiffFromFarmM: number | null } | null };
    const bWat = bRes.waterSources as { nearestSource?: { name: string; distanceFromCentroidM: number; elevationDiffFromFarmM: number | null } | null };
    const aEl = aRes.elevation as { farmElevationM: number; estimatedSlopePct: number };
    const bEl = bRes.elevation as { farmElevationM: number; estimatedSlopePct: number };

    const content = [
      `### Side-by-Side Location Comparison: **${farm.name}** vs. **${params.compareFarm.name}**`,
      "",
      "| Metric | " + farm.name + " | " + params.compareFarm.name + " | Provenance |",
      "|---|---|---|---|",
      `| Coordinates | ${farm.centerLat.toFixed(4)}°, ${farm.centerLon.toFixed(4)}° | ${params.compareFarm.centerLat.toFixed(4)}°, ${params.compareFarm.centerLon.toFixed(4)}° | User Input |`,
      `| Elevation & Slope | ${aEl.farmElevationM} m (${aEl.estimatedSlopePct}%) | ${bEl.farmElevationM} m (${bEl.estimatedSlopePct}%) | Observed (Copernicus DEM) |`,
      `| Annual Rainfall / ET₀ | ${aClin.annualPrecipMm} mm / ${aClin.annualEt0Mm} mm | ${bClin.annualPrecipMm} mm / ${bClin.annualEt0Mm} mm | Observed (Open-Meteo ERA5) |`,
      `| Aridity Class | ${aClin.aridityClass} (AI ${aClin.aridityIndex}) | ${bClin.aridityClass} (AI ${bClin.aridityIndex}) | Observed / Derived |`,
      `| Nearest Mapped Water | ${aWat.nearestSource ? `${aWat.nearestSource.name} (${aWat.nearestSource.distanceFromCentroidM} m)` : "None within 10 km"} | ${bWat.nearestSource ? `${bWat.nearestSource.name} (${bWat.nearestSource.distanceFromCentroidM} m)` : "None within 10 km"} | Observed (OSM/HydroSHEDS) |`,
      `| PV Specific Yield (PVGIS) | ${aSol.specificYieldKwhPerKwp} kWh/kWp/yr | ${bSol.specificYieldKwhPerKwp} kWh/kWp/yr | Modeled (JRC PVGIS v5.3) |`,
      "",
      "**Key Uncertainties**: Both sites require on-ground water availability verification (mapped water features do not confirm flow or water rights) and site-specific soil laboratory testing.",
    ].join("\n");

    return {
      id: `msg_${Date.now()}`,
      role: "assistant",
      content,
      toolCalls: traces,
      citations: deduplicateCitations(allCitations),
      modelUsed: "TerraPulse Deterministic Tool Orchestrator",
      createdAt: new Date().toISOString(),
    };
  }

  // Decide which specialized tools match the user's question
  const wantsReport = q.includes("report") || q.includes("feasibility") || q.includes("suitable") || q.includes("recommend") || q.includes("risk");
  const wantsWater = q.includes("water") || q.includes("river") || q.includes("well") || q.includes("pump") || q.includes("head") || q.includes("elevat");
  const wantsSolar = q.includes("solar") || q.includes("panel") || q.includes("pv") || q.includes("energy") || q.includes("battery");
  const wantsWeather = q.includes("weather") || q.includes("rain") || q.includes("climate") || q.includes("temp") || q.includes("wapor");
  const wantsCrop = q.includes("crop") || q.includes("plant") || q.includes("irrigat") || q.includes("water requirement");

  if (wantsReport && farm) {
    const report = (await run("generate_feasibility_report", { location_id: farm.id })) as {
      overallScore: number;
      verdict: string;
      executiveSummary: string;
      risks: Array<{ severity: string; title: string; detail: string }>;
      recommendations: string[];
      uncertainties: string[];
    };

    const content = [
      `### Feasibility Assessment — **${farm.name}** (${report.overallScore}/100 • \`${report.verdict}\`)`,
      "",
      report.executiveSummary,
      "",
      "#### Key Risks Identified",
      ...report.risks.map((r) => `- **[${r.severity}] ${r.title}**: ${r.detail}`),
      "",
      "#### Engineering & Agronomic Recommendations",
      ...report.recommendations.map((rec) => `- ${rec}`),
      "",
      "#### Uncertainties & Missing Field Data",
      ...report.uncertainties.slice(0, 3).map((u) => `- ${u}`),
    ].join("\n");

    return {
      id: `msg_${Date.now()}`,
      role: "assistant",
      content,
      toolCalls: traces,
      citations: deduplicateCitations(allCitations),
      modelUsed: "TerraPulse Deterministic Tool Orchestrator",
      createdAt: new Date().toISOString(),
    };
  }

  const sections: string[] = [];

  if (wantsWeather || (!wantsWater && !wantsSolar && !wantsCrop)) {
    const [weather, climate, wapor] = await Promise.all([
      run("get_weather", { latitude: lat, longitude: lon }),
      run("get_historical_climate", { latitude: lat, longitude: lon }),
      run("get_wapor_data", { latitude: lat, longitude: lon }),
    ]);
    const wCur = weather.current as { temperatureC: number; weatherSummary: string; relativeHumidityPct: number; windSpeedKmh: number };
    const wAlerts = weather.alerts as Array<{ title: string; description: string }>;
    const cl = climate as { annualPrecipMm: number; annualEt0Mm: number; aridityIndex: number; aridityClass: string };
    const wp = wapor as { actualEvapotranspirationMmYr: number | null; totalBiomassProductionKgHa: number | null };

    sections.push(
      `#### 1. Weather, Climate & Remote Sensing (Observed Data)`,
      `- **Current Conditions**: ${wCur.temperatureC}°C (${wCur.weatherSummary}), ${wCur.relativeHumidityPct}% RH, wind ${wCur.windSpeedKmh} km/h. ${wAlerts.length > 0 ? `**${wAlerts.length} active weather alert(s)** in the 7-day forecast.` : "No critical 7-day threshold alerts triggered."}`,
      `- **365-Day ERA5 Climate**: ${cl.annualPrecipMm} mm rainfall vs. ${cl.annualEt0Mm} mm reference ET₀ (**Aridity Index ${cl.aridityIndex}** — ${cl.aridityClass}).`,
      `- **FAO WaPOR v3 (300 m satellite)**: Actual ET ${wp.actualEvapotranspirationMmYr !== null ? `${wp.actualEvapotranspirationMmYr} mm/yr` : "N/A (COG timeout/outside coverage)"}, Biomass ${wp.totalBiomassProductionKgHa !== null ? `${wp.totalBiomassProductionKgHa} kg/ha/yr` : "N/A"}.`
    );
  }

  if (wantsWater || !wantsSolar) {
    const [waterData, elevData] = await Promise.all([
      run("get_nearby_water_sources", { latitude: lat, longitude: lon, radius: 10000 }),
      run("get_elevation", { latitude: lat, longitude: lon }),
    ]);
    const ws = waterData as {
      sources: Array<{ name: string; sourceType: string; distanceFromCentroidM: number; elevationDiffFromFarmM: number | null; cardinalDirection: string }>;
      nearestSource: { name: string; sourceType: string; distanceFromCentroidM: number; elevationDiffFromFarmM: number | null; cardinalDirection: string } | null;
      hydroBasin: { hybasId: string | null; irrigationWaterGap: number | null } | null;
      mandatoryWarning: string;
    };
    const el = elevData as { farmElevationM: number; estimatedSlopePct: number; slopeAspect: string };

    const nearest = ws.nearestSource;
    sections.push(
      `#### 2. Elevation & Mapped Water Proximity (Observed Geographic Data)`,
      `- **Terrain**: Elevation **${el.farmElevationM} m ASL**, estimated slope **${el.estimatedSlopePct}%** (${el.slopeAspect}).`,
      nearest
        ? `- **Nearest Mapped Feature**: **${nearest.name}** (${nearest.sourceType}) located **${nearest.distanceFromCentroidM} m ${nearest.cardinalDirection}** of the parcel center (elevation difference: ${nearest.elevationDiffFromFarmM !== null ? `${nearest.elevationDiffFromFarmM} m` : "unknown"}). Total ${ws.sources.length} mapped feature(s) within 10 km.${ws.hydroBasin?.hybasId ? ` Watershed HydroBASINS ID \`${ws.hydroBasin.hybasId}\`.` : ""}`
        : `- **Nearest Mapped Feature**: None found in OpenStreetMap/HydroSHEDS within 10 km.`,
      `- **Important Caveat**: ${ws.mandatoryWarning}`
    );
  }

  if (wantsSolar || wantsWater) {
    const cap = farm?.solarConfig.capacityKwp ?? 10;
    const tilt = farm?.solarConfig.tiltDeg ?? Math.round(Math.abs(lat) * 0.87);
    const flow = farm?.pumpConfig.flowRateM3Hr ?? 20;
    const tdh = farm?.pumpConfig.totalDynamicHeadM ?? 35;
    const combinedEff = farm
      ? (farm.pumpConfig.pumpEfficiencyPct * farm.pumpConfig.motorEfficiencyPct) / 100
      : 57.2;
    const hours = farm?.pumpConfig.operatingHoursDay ?? 6;

    const [solar, pump, comparison] = await Promise.all([
      run("calculate_solar_production", {
        latitude: lat,
        longitude: lon,
        capacity: cap,
        tilt,
        azimuth: farm?.solarConfig.azimuthDeg ?? 0,
      }),
      run("calculate_pump_energy", {
        flow_rate: flow,
        head: tdh,
        efficiency: combinedEff,
        operating_hours: hours,
      }),
      run("compare_solar_and_pump_energy", {
        location: { latitude: lat, longitude: lon },
        solar_configuration: { capacity_kwp: cap, tilt_deg: tilt, azimuth_deg: 0 },
        pump_configuration: {
          flow_rate_m3_hr: flow,
          head_m: tdh,
          efficiency_pct: combinedEff,
          operating_hours: hours,
        },
        crop: farm?.irrigationConfig.cropCode ?? "tomato",
        area: farm?.areaHectares ?? 5,
      }),
    ]);

    const s = solar as { annualKwh: number; dailyAvgKwh: number; specificYieldKwhPerKwp: number };
    const p = pump as { electricalPowerKw: number; hydraulicPowerKw: number; dailyEnergyKwh: number; totalDynamicHeadM: number };
    const c = comparison as {
      annualCoveragePct: number;
      worstMonthName: string;
      worstMonthCoveragePct: number;
      recommendedBatteryKwh: number;
      recommendedWaterStorageTankM3: number;
    };

    sections.push(
      `#### 3. Pump Hydraulics & PVGIS Solar Energy Balance (Modeled + Engineering Equations)`,
      `- **Pump Demand** *(Assumptions: ${flow} m³/h, ${p.totalDynamicHeadM} m TDH, ${combinedEff.toFixed(1)}% wire-to-water efficiency)*: Electrical load **${p.electricalPowerKw} kW** (${p.hydraulicPowerKw} kW hydraulic), consuming **${p.dailyEnergyKwh} kWh/day** over ${hours} h/day.`,
      `- **Solar Potential (PVGIS v5.3, ${cap} kWp @ ${tilt}° tilt)**: Estimated **${s.dailyAvgKwh} kWh/day** avg (**${s.annualKwh.toLocaleString()} kWh/yr**, ${s.specificYieldKwhPerKwp} kWh/kWp).`,
      `- **Solar vs. Irrigation Match**: Covers **${c.annualCoveragePct}%** of annual irrigation pumping energy, dropping to **${c.worstMonthCoveragePct}%** during peak demand in **${c.worstMonthName}**. Recommended buffer: **${c.recommendedWaterStorageTankM3} m³ elevated tank** or **${c.recommendedBatteryKwh} kWh battery**.`
    );
  }

  if (wantsCrop) {
    const cropRes = await run("calculate_crop_water_requirements", {
      crop: farm?.irrigationConfig.cropCode ?? "tomato",
      area: farm?.areaHectares ?? 5,
      latitude: lat,
      longitude: lon,
    });
    const irr = cropRes.irrigation as {
      crop: { name: string };
      irrigatedAreaHa: number;
      annualEtcMm: number;
      annualGrossVolumeM3: number;
      peakDailyWaterM3: number;
      peakMonthName: string;
    };
    const topCrops = cropRes.topCrops as Array<{ cropName: string; score: number; rating: string }>;

    sections.push(
      `#### 4. FAO-56 Crop Water Demand & Suitability (Modeled)`,
      `- **${irr.crop.name} (${irr.irrigatedAreaHa.toFixed(2)} ha, 90% drip)**: Annual ETc **${irr.annualEtcMm} mm**, gross irrigation **${irr.annualGrossVolumeM3.toLocaleString()} m³/yr**, peak **${irr.peakDailyWaterM3} m³/day** in ${irr.peakMonthName}.`,
      `- **Highest Climatic Match Crops**: ${topCrops.slice(0, 4).map((c) => `${c.cropName} (${c.score}/100 ${c.rating})`).join(", ")}.`
    );
  }

  sections.push(
    `#### Missing Information & Uncertainty`,
    `- Laboratory soil water retention (TAW), irrigation water salinity (EC), static/dynamic aquifer drawdown, and actual pipeline trench routing are not measured remotely and must be verified on-site.`
  );

  return {
    id: `msg_${Date.now()}`,
    role: "assistant",
    content: sections.join("\n\n"),
    toolCalls: traces,
    citations: deduplicateCitations(allCitations),
    modelUsed: "TerraPulse Deterministic Tool Orchestrator (Set GROQ_API_KEY for Groq LLM synthesis)",
    createdAt: new Date().toISOString(),
  };
}

export async function runAIChat(params: {
  farmId?: string;
  compareFarmId?: string;
  message: string;
  history?: Array<{ role: "user" | "assistant"; content: string }>;
  groqApiKeyOverride?: string;
  groqModelOverride?: string;
}): Promise<AIChatMessageRecord> {
  const farm = params.farmId ? await getFarmById(params.farmId) : null;
  const compareFarm = params.compareFarmId ? await getFarmById(params.compareFarmId) : null;

  const apiKey = params.groqApiKeyOverride?.trim() || process.env.GROQ_API_KEY?.trim();
  const modelName = params.groqModelOverride?.trim() || process.env.GROQ_MODEL?.trim();
  const baseUrl =
    process.env.GROQ_API_BASE_URL?.trim() || "https://api.groq.com/openai/v1";

  // If no Groq API key or model env is configured, execute the deterministic scientific tool orchestrator
  if (!apiKey || !modelName) {
    return runDeterministicToolAssistant({
      message: params.message,
      farm,
      compareFarm,
    });
  }

  const contextLines: string[] = [];
  if (farm) {
    contextLines.push(
      `Active Farm Context: id="${farm.id}", name="${farm.name}", lat=${farm.centerLat}, lon=${farm.centerLon}, areaHa=${farm.areaHectares}, crop="${farm.irrigationConfig.cropCode}", soil="${farm.soilProfile.textureClass}", solarKwp=${farm.solarConfig.capacityKwp}, solarTilt=${farm.solarConfig.tiltDeg}, pumpFlowM3Hr=${farm.pumpConfig.flowRateM3Hr}, pumpTdhM=${farm.pumpConfig.totalDynamicHeadM}.`
    );
  }
  if (compareFarm) {
    contextLines.push(
      `Comparison Farm Context: id="${compareFarm.id}", name="${compareFarm.name}", lat=${compareFarm.centerLat}, lon=${compareFarm.centerLon}, areaHa=${compareFarm.areaHectares}, crop="${compareFarm.irrigationConfig.cropCode}".`
    );
  }

  const messages: Array<Record<string, unknown>> = [
    {
      role: "system",
      content: `${SYSTEM_PROMPT}\n\n${contextLines.join("\n")}`,
    },
    ...(params.history ?? []).slice(-10).map((m) => ({
      role: m.role,
      content: m.content,
    })),
    {
      role: "user",
      content: params.message,
    },
  ];

  const traces: AIToolExecutionTrace[] = [];
  const allCitations: DataSourceCitation[] = [];

  try {
    for (let round = 0; round < 4; round++) {
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        signal: AbortSignal.timeout(25_000),
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: modelName,
          messages,
          tools: AI_TOOL_DEFINITIONS,
          tool_choice: "auto",
          temperature: 0.2,
          max_tokens: 1800,
        }),
      });

      if (!response.ok) {
        const errBody = await response.text();
        throw new Error(`Groq API HTTP ${response.status}: ${errBody.slice(0, 180)}`);
      }

      const completion = await response.json();
      const choice = completion.choices?.[0]?.message;
      if (!choice) throw new Error("Empty Groq completion response");

      const toolCalls: Array<{
        id: string;
        function: { name: string; arguments: string };
      }> = choice.tool_calls ?? [];

      if (toolCalls.length === 0) {
        return {
          id: `msg_${Date.now()}`,
          role: "assistant",
          content: String(choice.content ?? "Analysis complete."),
          toolCalls: traces,
          citations: deduplicateCitations(allCitations),
          modelUsed: `Groq (${modelName})`,
          createdAt: new Date().toISOString(),
        };
      }

      messages.push({
        role: "assistant",
        content: choice.content ?? null,
        tool_calls: toolCalls,
      });

      for (const tc of toolCalls) {
        let parsedArgs: Record<string, unknown> = {};
        try {
          parsedArgs = JSON.parse(tc.function.arguments || "{}");
        } catch {
          parsedArgs = {};
        }
        const execResult = await executeAITool(tc.function.name, parsedArgs);
        traces.push(execResult.trace);
        allCitations.push(...execResult.citations);

        messages.push({
          role: "tool",
          tool_call_id: tc.id,
          content: JSON.stringify(execResult.output).slice(0, 12000),
        });
      }
    }
  } catch (err) {
    // Graceful fallback to deterministic orchestrator if Groq call fails or rate-limits
    const fallback = await runDeterministicToolAssistant({
      message: params.message,
      farm,
      compareFarm,
    });
    fallback.content = `> **Note**: Groq API fallback activated (${err instanceof Error ? err.message : "unavailable"}). Results below come directly from verified analytical tools.\n\n${fallback.content}`;
    return fallback;
  }

  return runDeterministicToolAssistant({
    message: params.message,
    farm,
    compareFarm,
  });
}
