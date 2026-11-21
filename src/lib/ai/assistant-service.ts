import { getFarmById } from "@/lib/db/repository";
import type {
  AIChatMessageRecord,
  AIToolExecutionTrace,
  DataSourceCitation,
  FarmRecord,
} from "@/types/agri";
import { AI_TOOL_DEFINITIONS, executeAITool } from "./tools";

const SYSTEM_PROMPT = `You are TerraPulse, a clear, practical agricultural assistant helping farmers make real decisions.
You MUST obey these strict rules:
1. ALWAYS open your reply with ONE short, bold direct sentence answering the farmer's exact question in plain, everyday words (for example: "**Yes, your land is good for olives.**" or "**About 24 panels for most of the year. About 40 panels for July.**").
2. NEVER invent environmental measurements, weather values, solar production numbers, or water sources. Always run the analytical tools first.
3. Put plain numbers and practical options ("What can you do?" / cheaper choice) first. Avoid acronyms like ET0, PVGIS, TDH, kWp, FAO-56, or WaPOR in the main answer — keep scientific/model details inside a short closing "How do we know this:" section.
4. NEVER guarantee groundwater availability or crop yields: mapped water points on the map only show geographic location and must be checked in person before spending money.
5. Cite the real data sources used.`;

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
  const wantsRisk = q.includes("risk") || q.includes("problem") || q.includes("worry");
  const wantsWaterPointCheck =
    (q.includes("water point") || q.includes("source") || q.includes("river") || q.includes("well")) &&
    q.includes("good");
  const wantsPlanting = q.includes("when") || q.includes("plant") || q.includes("month") || q.includes("season");
  const wantsReport =
    !wantsRisk &&
    !wantsWaterPointCheck &&
    (q.includes("report") || q.includes("feasibility") || q.includes("good choice"));
  const wantsWater =
    wantsRisk ||
    wantsWaterPointCheck ||
    q.includes("water") ||
    q.includes("river") ||
    q.includes("well") ||
    q.includes("pump") ||
    q.includes("head") ||
    q.includes("elevat");
  const wantsSolar =
    q.includes("solar") ||
    q.includes("panel") ||
    q.includes("sun") ||
    q.includes("pv") ||
    q.includes("energy") ||
    q.includes("battery");
  const wantsWeather =
    wantsRisk ||
    q.includes("weather") ||
    q.includes("rain") ||
    q.includes("climate") ||
    q.includes("temp") ||
    q.includes("today") ||
    q.includes("wapor");
  const wantsCrop =
    wantsPlanting ||
    wantsRisk ||
    q.includes("crop") ||
    q.includes("olive") ||
    q.includes("citrus") ||
    q.includes("tomato") ||
    q.includes("suitable") ||
    q.includes("irrigat") ||
    q.includes("recommend");

  if (wantsReport && farm) {
    const report = (await run("generate_feasibility_report", { location_id: farm.id })) as {
      overallScore: number;
      verdict: string;
      executiveSummary: string;
      risks: Array<{ severity: string; title: string; detail: string }>;
      recommendations: string[];
      uncertainties: string[];
    };

    const topRisk = report.risks[0];
    const headline =
      topRisk && topRisk.severity === "HIGH"
        ? `**Yes, if you fix ${topRisk.title.toLowerCase()} first.**`
        : "**Good choice overall, after you check the water source in person.**";

    const content = [
      headline,
      "",
      topRisk
        ? `Your main challenge right now is: ${topRisk.detail}`
        : report.executiveSummary,
      "",
      report.recommendations.slice(0, 2).join(" "),
      "",
      `How do we know this: Climate, weather, sun power, and map water checks for ${farm.name} (feasibility score ${report.overallScore}/100). Always test soil and check water points in person before investing.`,
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

  type CurrentW = { temperatureC: number; weatherSummary: string; relativeHumidityPct: number; windSpeedKmh: number };
  type ClimateW = { annualPrecipMm: number; annualEt0Mm: number; aridityIndex: number; aridityClass: string };
  type WaterFeatureW = { name: string; sourceType: string; distanceFromCentroidM: number; elevationDiffFromFarmM: number | null; cardinalDirection: string };
  type WaterResW = { sources: WaterFeatureW[]; nearestSource: WaterFeatureW | null; mandatoryWarning: string };
  type ElevW = { farmElevationM: number; estimatedSlopePct: number };
  type SolarW = { annualKwh: number; dailyAvgKwh: number };
  type PumpW = { dailyEnergyKwh: number; electricalPowerKw: number };
  type CompareW = { annualCoveragePct: number; worstMonthName: string; worstMonthCoveragePct: number; recommendedBatteryKwh: number; recommendedWaterStorageTankM3: number };
  type IrrW = { crop: { name: string }; irrigatedAreaHa: number; annualGrossVolumeM3: number; peakDailyWaterM3: number; peakMonthName: string };

  let wCur = null as CurrentW | null;
  let wAlerts: Array<{ title: string; description: string }> = [];
  let cl = null as ClimateW | null;
  let ws = null as WaterResW | null;
  let el = null as ElevW | null;
  let sol = null as SolarW | null;
  let pmp = null as PumpW | null;
  let cmp = null as CompareW | null;
  let irr = null as IrrW | null;
  let topCrops: Array<{ cropName: string; score: number; rating: string }> = [];

  if (wantsWeather || wantsRisk || (!wantsWater && !wantsSolar && !wantsCrop)) {
    const [weather, climate] = await Promise.all([
      run("get_weather", { latitude: lat, longitude: lon }),
      run("get_historical_climate", { latitude: lat, longitude: lon }),
    ]);
    wCur = weather.current as CurrentW;
    wAlerts = (weather.alerts as Array<{ title: string; description: string }>) ?? [];
    cl = climate as ClimateW;
  }

  if (wantsWater || wantsRisk || !wantsSolar) {
    const [waterData, elevData] = await Promise.all([
      run("get_nearby_water_sources", { latitude: lat, longitude: lon, radius: 10000 }),
      run("get_elevation", { latitude: lat, longitude: lon }),
    ]);
    ws = waterData as WaterResW;
    el = elevData as ElevW;
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

    sol = solar as SolarW;
    pmp = pump as PumpW;
    cmp = comparison as CompareW;
  }

  if (wantsCrop || wantsWater || wantsRisk) {
    const targetCrop = q.includes("olive")
      ? "olive"
      : q.includes("citrus")
        ? "citrus"
        : q.includes("tomato")
          ? "tomato"
          : q.includes("wheat")
            ? "wheat"
            : farm?.irrigationConfig.cropCode ?? "tomato";
    const cropRes = await run("calculate_crop_water_requirements", {
      crop: targetCrop,
      area: farm?.areaHectares ?? 5,
      latitude: lat,
      longitude: lon,
    });
    irr = cropRes.irrigation as IrrW;
    topCrops = (cropRes.topCrops as Array<{ cropName: string; score: number; rating: string }>) ?? [];
  }

  // Build ONE clear direct answer sentence first + plain farmer details
  const cap = farm?.solarConfig.capacityKwp ?? 10;
  const currentPanels = farm?.solarConfig.panelCount ?? Math.max(1, Math.round((cap * 1000) / 500));
  const pumpDailyM3 = farm ? Math.round(farm.pumpConfig.flowRateM3Hr * farm.pumpConfig.operatingHoursDay) : 120;
  const paragraphs: string[] = [];

  if (wantsSolar && cmp && sol) {
    const worstPct = Math.round(cmp.worstMonthCoveragePct);
    const peakPanels = worstPct > 5 ? Math.ceil(currentPanels / (worstPct / 100)) : currentPanels * 2;
    const units10 = Math.max(1, Math.min(10, Math.round(worstPct / 10)));
    paragraphs.push(
      worstPct >= 95
        ? `**About ${currentPanels} solar panels (${cap} kW) are enough for your pump all year.**`
        : `**About ${currentPanels} panels for most of the year. About ${peakPanels} panels for ${cmp.worstMonthName}.**`,
      `You have ${cap} kW (${currentPanels} panels of 500 W), which makes ${Math.round(sol.annualKwh).toLocaleString()} kWh a year and covers ${Math.round(cmp.annualCoveragePct)}% over the whole year. In ${cmp.worstMonthName}, sun covers ${units10} of every 10 units your pump needs.`,
      `Cheaper choice: keep ${currentPanels} panels and add a ${Math.round(cmp.recommendedWaterStorageTankM3)} m³ water tank for summer.`
    );
  } else if (wantsWaterPointCheck && ws) {
    const nearest = ws.nearestSource;
    paragraphs.push(
      nearest
        ? `**It looks close on the map (${nearest.distanceFromCentroidM} m away), so go and check it in person first.**`
        : "**No water point appears near your farm on the map — check local wells with neighbors or a water survey.**",
      nearest
        ? `The map shows "${nearest.name}" ${nearest.distanceFromCentroidM} m ${nearest.cardinalDirection}${nearest.elevationDiffFromFarmM !== null && Math.abs(nearest.elevationDiffFromFarmM) <= 10 ? ", at nearly the same height as your land." : nearest.elevationDiffFromFarmM !== null && nearest.elevationDiffFromFarmM < 0 ? `, about ${Math.round(Math.abs(nearest.elevationDiffFromFarmM))} m lower than your farm.` : "."} A point on the map may be dry in summer, salty, or private.`
        : "Open map databases do not show every private well or small pond. Ask nearby farmers and check water depth before buying equipment."
    );
  } else if (wantsRisk && irr) {
    const peakM3 = Math.round(irr.peakDailyWaterM3);
    const waterShort = pumpDailyM3 < peakM3 * 0.95;
    paragraphs.push(
      waterShort
        ? `**Your biggest risk is not having enough water in ${irr.peakMonthName}.**`
        : `**Your main risk is checking summer water reliability before spending money.**`,
      waterShort
        ? `Your pump gives ${pumpDailyM3} m³ a day, while your ${irr.crop.name.toLowerCase()} needs ${peakM3} m³ a day in ${irr.peakMonthName}. Get a bigger pump, pump more hours a day, or add a second water source.`
        : `Your land has ${cl ? `${Math.round(cl.annualPrecipMm)} mm of rain a year` : "dry summer months"}, so inspect water salinity and test soil drainage before planting.`
    );
  } else if (wantsPlanting && irr) {
    paragraphs.push(
      `**Plant in spring or early autumn when temperatures are mild and summer heat has not peaked yet.**`,
      `Your ${irr.crop.name.toLowerCase()} drinks the most water in ${irr.peakMonthName} (about ${Math.round(irr.peakDailyWaterM3)} m³ a day across ${irr.irrigatedAreaHa.toFixed(1)} hectares). Planting before peak summer heat helps roots settle before dry weather starts.`
    );
  } else if (wantsCrop && irr) {
    const targetName = irr.crop.name.toLowerCase();
    const topMatch = topCrops.find((c) => c.cropName.toLowerCase().includes(targetName)) ?? topCrops[0];
    paragraphs.push(
      topMatch && topMatch.score >= 70
        ? `**Yes, your land and climate are good for ${targetName} (${topMatch.rating.toLowerCase()} match), as long as you have summer water.**`
        : `**${irr.crop.name} can grow here, but check water supply in ${irr.peakMonthName} first.**`,
      `In ${irr.peakMonthName}, ${irr.irrigatedAreaHa.toFixed(1)} hectares of ${targetName} need about ${Math.round(irr.peakDailyWaterM3)} m³ of water a day. ${topCrops.length ? `Top low-water choices for your climate: ${topCrops.slice(0, 3).map((c) => c.cropName).join(", ")}.` : ""}`
    );
  } else if (wantsWater && irr) {
    const peakM3 = Math.round(irr.peakDailyWaterM3);
    paragraphs.push(
      pumpDailyM3 < peakM3 * 0.95
        ? `**Not in ${irr.peakMonthName}: your pump gives ${pumpDailyM3} m³ a day, but your crops need ${peakM3} m³ a day.**`
        : `**Yes, your pump (${pumpDailyM3} m³ a day) covers peak demand (${peakM3} m³ a day) in ${irr.peakMonthName}.**`,
      ws?.nearestSource
        ? `The closest water point on the map is "${ws.nearestSource.name}" (${ws.nearestSource.distanceFromCentroidM} m away). Always visit it before buying a pump.`
        : "No mapped water source appeared within 10 km, so rely on verified on-site well yield."
    );
  } else if (wCur && cl) {
    paragraphs.push(
      `**Right now it is ${Math.round(wCur.temperatureC)}°C (${wCur.weatherSummary.toLowerCase()}) with ${wAlerts.length ? `${wAlerts.length} weather alert(s) ahead` : "a calm week ahead"}.**`,
      `Your farm gets about ${Math.round(cl.annualPrecipMm)} mm of rain per year. ${el ? `Land height is ${Math.round(el.farmElevationM)} m with gentle ${el.estimatedSlopePct}% slope.` : ""}`
    );
  } else {
    paragraphs.push("**Here is what your farm data shows today.**");
  }

  paragraphs.push(
    `How do we know this: Live weather, sun power model for your exact location, elevation data, mapped water features${pmp ? `, and your pump settings (${pmp.electricalPowerKw} kW)` : ""}. This is an estimate — test water depth, salinity, and soil on your farm before buying.`
  );

  return {
    id: `msg_${Date.now()}`,
    role: "assistant",
    content: paragraphs.join("\n\n"),
    toolCalls: traces,
    citations: deduplicateCitations(allCitations),
    modelUsed: "TerraPulse Deterministic Tool Orchestrator",
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
