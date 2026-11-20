import { getFarmById, saveAnalysisBundle, saveReport } from "@/lib/db/repository";
import {
  calculateCropWaterRequirements,
  rankCropSuitability,
} from "@/lib/engines/fao56-calculator";
import { calculatePumpEnergy } from "@/lib/engines/pump-calculator";
import { compareSolarAndPumpEnergy } from "@/lib/engines/solar-irrigation-matcher";
import {
  buildFeasibilityReport,
  runCompleteFarmAnalysis,
} from "@/lib/services/analysis-orchestrator";
import { fetchElevationProfile } from "@/lib/services/elevation";
import { fetchHistoricalClimate, fetchWeatherAndForecast } from "@/lib/services/open-meteo";
import { fetchPVGISSolarAnalysis } from "@/lib/services/pvgis";
import { fetchWaPORData } from "@/lib/services/wapor";
import { fetchNearbyWaterSources } from "@/lib/services/water-sources";
import type { AIToolExecutionTrace, DataSourceCitation } from "@/types/agri";

export interface OpenAIToolDefinition {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export const AI_TOOL_DEFINITIONS: OpenAIToolDefinition[] = [
  {
    type: "function",
    function: {
      name: "analyze_location",
      description:
        "Run a baseline environmental, elevation, weather, water-source, and solar screening at GPS coordinates.",
      parameters: {
        type: "object",
        properties: {
          latitude: { type: "number", minimum: -90, maximum: 90 },
          longitude: { type: "number", minimum: -180, maximum: 180 },
        },
        required: ["latitude", "longitude"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_weather",
      description: "Fetch real-time current weather, 7-day forecast, and agronomic weather alerts.",
      parameters: {
        type: "object",
        properties: {
          latitude: { type: "number", minimum: -90, maximum: 90 },
          longitude: { type: "number", minimum: -180, maximum: 180 },
        },
        required: ["latitude", "longitude"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_historical_climate",
      description:
        "Retrieve 365-day ERA5 climate history, annual rainfall, ET0, seasonal breakdown, and aridity index.",
      parameters: {
        type: "object",
        properties: {
          latitude: { type: "number", minimum: -90, maximum: 90 },
          longitude: { type: "number", minimum: -180, maximum: 180 },
        },
        required: ["latitude", "longitude"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_nearby_water_sources",
      description:
        "Query OpenStreetMap and HydroSHEDS/HydroBASINS for nearby rivers, canals, reservoirs, springs, and mapped wells.",
      parameters: {
        type: "object",
        properties: {
          latitude: { type: "number", minimum: -90, maximum: 90 },
          longitude: { type: "number", minimum: -180, maximum: 180 },
          radius: { type: "number", minimum: 500, maximum: 30000, default: 10000 },
        },
        required: ["latitude", "longitude"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_elevation",
      description:
        "Retrieve Copernicus DEM elevation, field relief, slope percentage, and terrain aspect.",
      parameters: {
        type: "object",
        properties: {
          latitude: { type: "number", minimum: -90, maximum: 90 },
          longitude: { type: "number", minimum: -180, maximum: 180 },
        },
        required: ["latitude", "longitude"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_wapor_data",
      description:
        "Query FAO WaPOR v3 remote sensing actual evapotranspiration, reference ET, biomass production, and water productivity.",
      parameters: {
        type: "object",
        properties: {
          latitude: { type: "number", minimum: -90, maximum: 90 },
          longitude: { type: "number", minimum: -180, maximum: 180 },
        },
        required: ["latitude", "longitude"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "calculate_solar_production",
      description: "Query European Commission JRC PVGIS v5.3 for monthly and annual PV yield.",
      parameters: {
        type: "object",
        properties: {
          latitude: { type: "number", minimum: -90, maximum: 90 },
          longitude: { type: "number", minimum: -180, maximum: 180 },
          capacity: { type: "number", minimum: 0.2, maximum: 5000, default: 8 },
          tilt: { type: "number", minimum: 0, maximum: 90, default: 30 },
          azimuth: { type: "number", minimum: -180, maximum: 180, default: 0 },
        },
        required: ["latitude", "longitude"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "calculate_pump_energy",
      description:
        "Calculate deterministic hydraulic pump power (kW) and daily/monthly energy demand (kWh) from flow, head, efficiency, and operating hours.",
      parameters: {
        type: "object",
        properties: {
          flow_rate: { type: "number", description: "Flow rate in m3/hour" },
          head: { type: "number", description: "Total dynamic head in meters" },
          efficiency: {
            type: "number",
            description: "Combined pump+motor efficiency percentage (e.g. 58)",
          },
          operating_hours: { type: "number", description: "Pumping hours per day" },
        },
        required: ["flow_rate", "head", "efficiency", "operating_hours"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "calculate_crop_water_requirements",
      description:
        "Calculate FAO-56 monthly and annual crop evapotranspiration (ETc) and gross irrigation water demand for a crop and area.",
      parameters: {
        type: "object",
        properties: {
          crop: { type: "string", description: "Crop code (tomato, citrus, olive, wheat, maize, potato, alfalfa, sorghum, cotton, date_palm)" },
          area: { type: "number", description: "Irrigated area in hectares" },
          latitude: { type: "number" },
          longitude: { type: "number" },
        },
        required: ["crop", "area", "latitude", "longitude"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "compare_solar_and_pump_energy",
      description:
        "Compare PVGIS monthly solar electricity generation against irrigation pumping demand and size battery/water storage.",
      parameters: {
        type: "object",
        properties: {
          location: {
            type: "object",
            properties: {
              latitude: { type: "number" },
              longitude: { type: "number" },
            },
            required: ["latitude", "longitude"],
          },
          solar_configuration: {
            type: "object",
            properties: {
              capacity_kwp: { type: "number" },
              tilt_deg: { type: "number" },
              azimuth_deg: { type: "number" },
            },
          },
          pump_configuration: {
            type: "object",
            properties: {
              flow_rate_m3_hr: { type: "number" },
              head_m: { type: "number" },
              efficiency_pct: { type: "number" },
              operating_hours: { type: "number" },
            },
          },
        },
        required: ["location"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "generate_feasibility_report",
      description:
        "Generate and persist a full multi-engine agricultural feasibility report for a saved property ID.",
      parameters: {
        type: "object",
        properties: {
          location_id: { type: "string", description: "Saved Farm ID" },
        },
        required: ["location_id"],
      },
    },
  },
];

export async function executeAITool(
  toolName: string,
  rawArgs: Record<string, unknown>
): Promise<{
  trace: AIToolExecutionTrace;
  citations: DataSourceCitation[];
  output: unknown;
}> {
  const id = `tool_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const executedAt = new Date().toISOString();
  const citations: DataSourceCitation[] = [];

  if (toolName === "get_weather") {
    const lat = Number(rawArgs.latitude);
    const lon = Number(rawArgs.longitude);
    const data = await fetchWeatherAndForecast(lat, lon);
    citations.push(data.citation);
    return {
      trace: {
        id,
        toolName,
        arguments: { latitude: lat, longitude: lon },
        resultSummary: `Current ${data.current.temperatureC}°C (${data.current.weatherSummary}), humidity ${data.current.relativeHumidityPct}%, ${data.alerts.length} active alert(s).`,
        provenance: "OBSERVED",
        executedAt,
        data,
      },
      citations,
      output: data,
    };
  }

  if (toolName === "get_historical_climate") {
    const lat = Number(rawArgs.latitude);
    const lon = Number(rawArgs.longitude);
    const data = await fetchHistoricalClimate(lat, lon);
    citations.push(data.citation);
    return {
      trace: {
        id,
        toolName,
        arguments: { latitude: lat, longitude: lon },
        resultSummary: `Annual rainfall ${data.annualPrecipMm} mm vs. ET₀ ${data.annualEt0Mm} mm (Aridity Index ${data.aridityIndex}, ${data.aridityClass}).`,
        provenance: "OBSERVED",
        executedAt,
        data,
      },
      citations,
      output: data,
    };
  }

  if (toolName === "get_nearby_water_sources") {
    const lat = Number(rawArgs.latitude);
    const lon = Number(rawArgs.longitude);
    const radius = Number(rawArgs.radius ?? 10000);
    const data = await fetchNearbyWaterSources(lat, lon, radius);
    citations.push(...data.citations);
    return {
      trace: {
        id,
        toolName,
        arguments: { latitude: lat, longitude: lon, radius },
        resultSummary: data.nearestSource
          ? `Found ${data.sources.length} mapped feature(s). Nearest: ${data.nearestSource.name} (${data.nearestSource.sourceType}) at ${data.nearestSource.distanceFromCentroidM} m, elev diff ${data.nearestSource.elevationDiffFromFarmM ?? "N/A"} m (unverified operational status).`
          : `No mapped water features found within ${radius} m.`,
        provenance: "OBSERVED",
        executedAt,
        data,
      },
      citations,
      output: data,
    };
  }

  if (toolName === "get_elevation") {
    const lat = Number(rawArgs.latitude);
    const lon = Number(rawArgs.longitude);
    const data = await fetchElevationProfile(lat, lon);
    citations.push(data.citation);
    return {
      trace: {
        id,
        toolName,
        arguments: { latitude: lat, longitude: lon },
        resultSummary: `Elevation ${data.farmElevationM} m ASL, terrain slope ${data.estimatedSlopePct}% (${data.slopeAspect}).`,
        provenance: "OBSERVED",
        executedAt,
        data,
      },
      citations,
      output: data,
    };
  }

  if (toolName === "get_wapor_data") {
    const lat = Number(rawArgs.latitude);
    const lon = Number(rawArgs.longitude);
    const data = await fetchWaPORData(lat, lon);
    citations.push(data.citation);
    return {
      trace: {
        id,
        toolName,
        arguments: { latitude: lat, longitude: lon },
        resultSummary: `WaPOR v3 AETI: ${data.actualEvapotranspirationMmYr ?? "N/A"} mm/yr, RET: ${data.referenceEvapotranspirationMmYr ?? "N/A"} mm/yr, Biomass: ${data.totalBiomassProductionKgHa ?? "N/A"} kg/ha.`,
        provenance: data.citation.provenance,
        executedAt,
        data,
      },
      citations,
      output: data,
    };
  }

  if (toolName === "calculate_solar_production") {
    const lat = Number(rawArgs.latitude);
    const lon = Number(rawArgs.longitude);
    const capacity = Number(rawArgs.capacity ?? 8);
    const tilt = Number(rawArgs.tilt ?? Math.round(Math.abs(lat) * 0.87));
    const azimuth = Number(rawArgs.azimuth ?? 0);
    const data = await fetchPVGISSolarAnalysis({
      latitude: lat,
      longitude: lon,
      capacityKwp: capacity,
      tiltDeg: tilt,
      azimuthDeg: azimuth,
      mountingType: "free",
      systemLossPct: 14,
    });
    citations.push(data.citation);
    return {
      trace: {
        id,
        toolName,
        arguments: { latitude: lat, longitude: lon, capacity, tilt, azimuth },
        resultSummary: `${capacity} kWp PVGIS estimate: ${data.dailyAvgKwh} kWh/day avg (${data.annualKwh.toLocaleString()} kWh/yr, ${data.specificYieldKwhPerKwp} kWh/kWp).`,
        provenance: "MODELED",
        executedAt,
        data,
      },
      citations,
      output: data,
    };
  }

  if (toolName === "calculate_pump_energy") {
    const flowRate = Number(rawArgs.flow_rate ?? 20);
    const head = Number(rawArgs.head ?? 35);
    const combinedEff = Number(rawArgs.efficiency ?? 58);
    const hours = Number(rawArgs.operating_hours ?? 6);
    const data = calculatePumpEnergy({
      flowRateM3Hr: flowRate,
      staticElevationDiffM: head,
      pipeLengthM: 150,
      pipeDiameterMm: 75,
      operatingPressureHeadM: 0,
      pumpEfficiencyPct: Math.min(90, combinedEff / 0.88),
      motorEfficiencyPct: 88,
      operatingHoursDay: hours,
      overrideTotalDynamicHeadM: head,
    });
    return {
      trace: {
        id,
        toolName,
        arguments: { flow_rate: flowRate, head, efficiency: combinedEff, operating_hours: hours },
        resultSummary: `Shaft/Electrical power: ${data.electricalPowerKw} kW (${data.hydraulicPowerKw} kW hydraulic), ${data.dailyEnergyKwh} kWh/day (${data.monthlyEnergyKwh} kWh/mo).`,
        provenance: "MODELED",
        executedAt,
        data,
      },
      citations,
      output: data,
    };
  }

  if (toolName === "calculate_crop_water_requirements") {
    const crop = String(rawArgs.crop ?? "tomato");
    const area = Number(rawArgs.area ?? 5);
    const lat = Number(rawArgs.latitude);
    const lon = Number(rawArgs.longitude);
    const climate = await fetchHistoricalClimate(lat, lon);
    citations.push(climate.citation);
    const data = calculateCropWaterRequirements({
      cropCode: crop,
      irrigatedAreaHa: area,
      irrigationMethod: "DRIP",
      plantingMonth: 3,
      monthlyClimate: climate.monthly,
    });
    const suitability = rankCropSuitability(climate.monthly, 3);
    return {
      trace: {
        id,
        toolName,
        arguments: { crop, area, latitude: lat, longitude: lon },
        resultSummary: `${data.crop.name} (${area} ha, drip 90%): ETc ${data.annualEtcMm} mm/yr, gross irrigation ${data.annualGrossVolumeM3.toLocaleString()} m³/yr, peak ${data.peakDailyWaterM3} m³/day in ${data.peakMonthName}.`,
        provenance: "MODELED",
        executedAt,
        data: { irrigation: data, topCrops: suitability.slice(0, 5) },
      },
      citations,
      output: { irrigation: data, topCrops: suitability.slice(0, 5) },
    };
  }

  if (toolName === "compare_solar_and_pump_energy") {
    const loc = (rawArgs.location as { latitude?: number; longitude?: number }) ?? {};
    const solCfg = (rawArgs.solar_configuration as Record<string, number>) ?? {};
    const pumpCfg = (rawArgs.pump_configuration as Record<string, number>) ?? {};
    const lat = Number(loc.latitude ?? rawArgs.latitude ?? 36.605);
    const lon = Number(loc.longitude ?? rawArgs.longitude ?? 2.945);
    const cap = Number(solCfg.capacity_kwp ?? 10);
    const tilt = Number(solCfg.tilt_deg ?? Math.round(Math.abs(lat) * 0.87));
    const az = Number(solCfg.azimuth_deg ?? 0);

    const [solar, climate] = await Promise.all([
      fetchPVGISSolarAnalysis({
        latitude: lat,
        longitude: lon,
        capacityKwp: cap,
        tiltDeg: tilt,
        azimuthDeg: az,
        mountingType: "free",
        systemLossPct: 14,
      }),
      fetchHistoricalClimate(lat, lon),
    ]);
    citations.push(solar.citation, climate.citation);

    const pump = calculatePumpEnergy({
      flowRateM3Hr: Number(pumpCfg.flow_rate_m3_hr ?? 24),
      staticElevationDiffM: Number(pumpCfg.head_m ?? 35),
      pipeLengthM: 180,
      pipeDiameterMm: 90,
      operatingPressureHeadM: 0,
      pumpEfficiencyPct: 66,
      motorEfficiencyPct: 88,
      operatingHoursDay: Number(pumpCfg.operating_hours ?? 6),
      overrideTotalDynamicHeadM: Number(pumpCfg.head_m ?? 35),
    });

    const cropWater = calculateCropWaterRequirements({
      cropCode: String(rawArgs.crop ?? "citrus"),
      irrigatedAreaHa: Number(rawArgs.area ?? 10),
      irrigationMethod: "DRIP",
      plantingMonth: 3,
      monthlyClimate: climate.monthly,
      pumpFlowRateM3Hr: pump.flowRateM3Hr,
    });

    const comparison = compareSolarAndPumpEnergy({
      solarMonthly: solar.monthly,
      pumpResult: pump,
      cropWaterResult: cropWater,
    });

    return {
      trace: {
        id,
        toolName,
        arguments: { lat, lon, cap, pump },
        resultSummary: `Annual PV ${comparison.annualSolarKwh.toLocaleString()} kWh vs. pump demand ${comparison.annualPumpKwh.toLocaleString()} kWh (${comparison.annualCoveragePct}% annual coverage; ${comparison.worstMonthCoveragePct}% in worst month ${comparison.worstMonthName}).`,
        provenance: "MODELED",
        executedAt,
        data: comparison,
      },
      citations,
      output: comparison,
    };
  }

  if (toolName === "generate_feasibility_report") {
    const farmId = String(rawArgs.location_id ?? "");
    const farm = await getFarmById(farmId);
    if (!farm) {
      return {
        trace: {
          id,
          toolName,
          arguments: { location_id: farmId },
          resultSummary: `Property ${farmId} not found in server repository.`,
          provenance: "ASSUMPTION",
          executedAt,
        },
        citations,
        output: { error: "Farm not found" },
      };
    }
    const bundle = await runCompleteFarmAnalysis(farm);
    saveAnalysisBundle(bundle);
    const report = buildFeasibilityReport(farm, bundle);
    await saveReport(report);
    citations.push(...report.sources);
    return {
      trace: {
        id,
        toolName,
        arguments: { location_id: farmId },
        resultSummary: `Generated report (${report.overallScore}/100, verdict ${report.verdict}) for ${farm.name}.`,
        provenance: "MODELED",
        executedAt,
        data: report,
      },
      citations,
      output: report,
    };
  }

  // analyze_location default
  const lat = Number(rawArgs.latitude);
  const lon = Number(rawArgs.longitude);
  const [weather, climate, elevation, waterSources, solar] = await Promise.all([
    fetchWeatherAndForecast(lat, lon),
    fetchHistoricalClimate(lat, lon),
    fetchElevationProfile(lat, lon),
    fetchNearbyWaterSources(lat, lon, 10000),
    fetchPVGISSolarAnalysis({
      latitude: lat,
      longitude: lon,
      capacityKwp: 10,
      tiltDeg: Math.round(Math.abs(lat) * 0.87),
      azimuthDeg: 0,
      mountingType: "free",
      systemLossPct: 14,
    }),
  ]);
  citations.push(
    weather.citation,
    climate.citation,
    elevation.citation,
    ...waterSources.citations,
    solar.citation
  );
  const topCrops = rankCropSuitability(climate.monthly, 3).slice(0, 5);
  const composite = { weather, climate, elevation, waterSources, solar, topCrops };
  return {
    trace: {
      id,
      toolName: "analyze_location",
      arguments: { latitude: lat, longitude: lon },
      resultSummary: `Analyzed (${lat.toFixed(4)}, ${lon.toFixed(4)}): ${elevation.farmElevationM} m ASL, ${climate.annualPrecipMm} mm/yr rain, ${climate.aridityClass}, ${waterSources.sources.length} mapped water features, 10 kWp PVGIS yield ${solar.annualKwh.toLocaleString()} kWh/yr.`,
      provenance: "OBSERVED",
      executedAt,
      data: composite,
    },
    citations,
    output: composite,
  };
}
