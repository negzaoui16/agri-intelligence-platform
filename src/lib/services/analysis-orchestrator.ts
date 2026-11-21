import {
  calculateCropWaterRequirements,
  calculateMultiCropWaterRequirements,
  getCropSpec,
  rankCropSuitability,
} from "@/lib/engines/fao56-calculator";
import { calculatePumpEnergy } from "@/lib/engines/pump-calculator";
import { compareSolarAndPumpEnergy } from "@/lib/engines/solar-irrigation-matcher";
import type {
  CompleteFarmAnalysisBundle,
  DataSourceCitation,
  FarmRecord,
  FeasibilityReportPayload,
  FeasibilityVerdict,
} from "@/types/agri";
import { fetchElevationProfile } from "./elevation";
import { fetchHistoricalClimate, fetchWeatherAndForecast } from "./open-meteo";
import { fetchPVGISSolarAnalysis } from "./pvgis";
import { fetchWaPORData } from "./wapor";
import { fetchNearbyWaterSources } from "./water-sources";
import { selectFarmerMetrics } from "./farmer-metrics";

export async function runCompleteFarmAnalysis(
  farm: FarmRecord
): Promise<CompleteFarmAnalysisBundle> {
  const lat = farm.centerLat;
  const lon = farm.centerLon;
  const ring = farm.boundary?.coordinates?.[0];

  // Execute external scientific engines concurrently
  const [weather, climate, elevation, waterSources, wapor, solar] = await Promise.all([
    fetchWeatherAndForecast(lat, lon),
    fetchHistoricalClimate(lat, lon),
    fetchElevationProfile(lat, lon, ring),
    fetchNearbyWaterSources(lat, lon, 10_000, farm.boundary),
    fetchWaPORData(lat, lon),
    fetchPVGISSolarAnalysis({
      latitude: lat,
      longitude: lon,
      capacityKwp: farm.solarConfig.capacityKwp,
      tiltDeg: farm.solarConfig.tiltDeg,
      azimuthDeg: farm.solarConfig.azimuthDeg,
      mountingType: farm.solarConfig.mountingType,
      systemLossPct: farm.solarConfig.systemLossPct,
      optimizeAngles: farm.solarConfig.optimizeAngles,
    }),
  ]);

  const nearestWaterElevDiffM =
    waterSources.nearestSource?.elevationDiffFromFarmM ?? farm.pumpConfig.staticHeadM;
  const effectiveStaticHeadM =
    farm.pumpConfig.staticHeadM > 0
      ? farm.pumpConfig.staticHeadM
      : Math.max(0, nearestWaterElevDiffM);

  const pump = calculatePumpEnergy({
    flowRateM3Hr: farm.pumpConfig.flowRateM3Hr,
    staticElevationDiffM: effectiveStaticHeadM,
    pipeLengthM: farm.pumpConfig.pipeLengthM,
    pipeDiameterMm: farm.pumpConfig.pipeDiameterMm,
    pipeMaterialC: farm.pumpConfig.pipeMaterialC,
    operatingPressureHeadM: farm.pumpConfig.operatingPressureHeadM,
    pumpEfficiencyPct: farm.pumpConfig.pumpEfficiencyPct,
    motorEfficiencyPct: farm.pumpConfig.motorEfficiencyPct,
    operatingHoursDay: farm.pumpConfig.operatingHoursDay,
  });

  const multiCropResult =
    farm.crops && farm.crops.length > 0
      ? calculateMultiCropWaterRequirements({
          farmCrops: farm.crops,
          monthlyClimate: climate.monthly,
          soilProfile: farm.soilProfile,
          pumpFlowRateM3Hr: farm.pumpConfig.flowRateM3Hr,
        })
      : null;

  const irrigation =
    multiCropResult ??
    calculateCropWaterRequirements({
      cropCode: farm.irrigationConfig.cropCode,
      irrigatedAreaHa: farm.areaHectares,
      irrigationMethod: farm.irrigationConfig.irrigationMethod,
      plantingMonth: farm.irrigationConfig.plantingMonth,
      monthlyClimate: climate.monthly,
      soilProfile: farm.soilProfile,
      pumpFlowRateM3Hr: farm.pumpConfig.flowRateM3Hr,
    });

  const solarVsPump = compareSolarAndPumpEnergy({
    solarMonthly: solar.monthly,
    pumpResult: pump,
    cropWaterResult: irrigation,
  });

  const cropSuitability = rankCropSuitability(
    climate.monthly,
    farm.irrigationConfig.plantingMonth
  );

  return {
    farmId: farm.id,
    coordinates: { latitude: lat, longitude: lon },
    weather,
    climate,
    elevation,
    waterSources,
    wapor,
    solar,
    irrigation,
    pump,
    solarVsPump,
    cropSuitability,
    generatedAt: new Date().toISOString(),
  };
}

export function buildFeasibilityReport(
  farm: FarmRecord,
  bundle: CompleteFarmAnalysisBundle
): FeasibilityReportPayload {
  const crop = getCropSpec(farm.irrigationConfig.cropCode);
  const nearest = bundle.waterSources.nearestSource;
  const metrics = selectFarmerMetrics(farm, bundle);

  const risks: FeasibilityReportPayload["risks"] = [];

  if (metrics.isWaterShort && metrics.peakDailyDemandM3 !== null) {
    risks.push({
      category: "WATER",
      severity: "HIGH",
      title: `Water supply too small in ${metrics.peakMonthName}`,
      detail: `Your pump gives ${metrics.pumpDailySupplyM3} m³ a day (${metrics.pumpFlowM3Hr} m³/h × ${metrics.pumpHoursDay} h), but in ${metrics.peakMonthName} your crops need ${metrics.peakDailyDemandM3} m³ a day (about 1 of every ${metrics.cupsDenominator} cups needed).`,
    });
  }

  if (bundle.climate.aridityIndex < 0.2) {
    risks.push({
      category: "CLIMATE",
      severity: "HIGH",
      title: `${bundle.climate.aridityClass} Water Deficit Climate`,
      detail: `Annual reference ET₀ (${bundle.climate.annualEt0Mm} mm) greatly exceeds rainfall (${bundle.climate.annualPrecipMm} mm; Aridity Index ${bundle.climate.aridityIndex}). Rainfed agriculture is unviable without reliable irrigation.`,
    });
  } else if (bundle.climate.aridityIndex < 0.5) {
    risks.push({
      category: "CLIMATE",
      severity: "MODERATE",
      title: `Semi-Arid Seasonal Moisture Deficit`,
      detail: `Annual rainfall (${bundle.climate.annualPrecipMm} mm) falls short of ET₀ (${bundle.climate.annualEt0Mm} mm), requiring supplemental irrigation during dry summer months.`,
    });
  }

  if (!nearest) {
    risks.push({
      category: "WATER",
      severity: "HIGH",
      title: "No Mapped Surface Water or Wells Within 10 km",
      detail:
        "Neither OpenStreetMap nor HydroSHEDS returned a mapped water feature within 10 km. Field hydrogeological survey and test drilling are essential before investment.",
    });
  } else {
    risks.push({
      category: "WATER",
      severity: nearest.distanceFromBoundaryM > 1500 ? "MODERATE" : "LOW",
      title: "Unverified Mapped Water Feature Proximity",
      detail: `Nearest mapped feature (${nearest.name}, ${nearest.sourceType}) is ${nearest.distanceFromBoundaryM} m away. Public map presence does NOT guarantee perennial water flow, salinity suitability, or abstraction permits.`,
    });
  }

  if (bundle.pump.totalDynamicHeadM > 60) {
    risks.push({
      category: "HYDRAULIC",
      severity: "HIGH",
      title: "High Total Dynamic Pumping Head",
      detail: `Total Dynamic Head of ${bundle.pump.totalDynamicHeadM} m drives electrical demand to ${bundle.pump.electricalPowerKw} kW (${bundle.pump.specificEnergyKwhPerM3} kWh/m³). Check pipe sizing to curb friction losses.`,
    });
  }

  if (bundle.solarVsPump.worstMonthCoveragePct < 75) {
    risks.push({
      category: "ENERGY",
      severity: "MODERATE",
      title: `Peak-Month Solar Shortfall (${bundle.solarVsPump.worstMonthName})`,
      detail: `Solar array covers ${bundle.solarVsPump.worstMonthCoveragePct}% of pumping energy in ${bundle.solarVsPump.worstMonthName} (deficit ${bundle.solarVsPump.worstMonthDeficitKwh} kWh). Hybrid backup, larger PV array, or water storage is needed.`,
    });
  }

  if (bundle.elevation.estimatedSlopePct > 8) {
    risks.push({
      category: "AGRONOMIC",
      severity: "MODERATE",
      title: `Sloped Terrain (${bundle.elevation.estimatedSlopePct}%)`,
      detail: `Parcel slope increases runoff and pressure variation across irrigation blocks; pressure-compensating drip emitters and contour planting are advised.`,
    });
  }

  if (bundle.weather.alerts.length > 0) {
    risks.push({
      category: "CLIMATE",
      severity: "MODERATE",
      title: `${bundle.weather.alerts.length} Active 7-Day Weather Advisory Alert(s)`,
      detail: bundle.weather.alerts.map((a) => `${a.title}: ${a.description}`).join(" "),
    });
  }

  // Deterministic composite score (0..100)
  let score = 82;
  if (bundle.climate.aridityIndex < 0.2) score -= 14;
  else if (bundle.climate.aridityIndex < 0.5) score -= 6;
  if (!nearest) score -= 18;
  else if (nearest.distanceFromBoundaryM > 2500) score -= 8;
  if (metrics.isWaterShort && metrics.waterDeficitRatio > 0) {
    // Proportional deduction so pump undersizing always lowers the score honestly
    score -= Math.max(4, Math.round(metrics.waterDeficitRatio * 18));
  }
  if (bundle.solarVsPump.annualCoveragePct >= 95) score += 6;
  else if (bundle.solarVsPump.annualCoveragePct < 60) score -= 12;
  if (bundle.solarVsPump.worstMonthCoveragePct < 70) score -= 6;
  if (bundle.elevation.estimatedSlopePct > 10) score -= 8;
  score = Math.max(25, Math.min(96, Math.round(score)));

  let verdict: FeasibilityVerdict = "FEASIBLE_WITH_MITIGATION";
  if (metrics.isWaterShort && score >= 80) {
    // Never label a farm "HIGHLY_FEASIBLE" when the pump cannot meet peak summer water demand
    score = 79;
  }
  if (score >= 80) verdict = "HIGHLY_FEASIBLE";
  else if (score >= 62) verdict = "FEASIBLE_WITH_MITIGATION";
  else if (score >= 45) verdict = "CONDITIONAL";
  else verdict = "HIGH_RISK";

  const recommendations: string[] = [
    `Water Verification: Physically inspect ${nearest ? `${nearest.name} (${nearest.distanceFromBoundaryM} m ${nearest.cardinalDirection})` : "site groundwater potential"} for seasonal flow reliability, electrical conductivity (salinity), and legal water rights before purchasing pumping equipment.`,
    `Irrigation Design: Maintain ${farm.irrigationConfig.irrigationMethod.toLowerCase().replace("_", " ")} irrigation (${bundle.irrigation.applicationEfficiencyPct}% efficiency) targeting ${crop.name}; peak demand reaches ${bundle.irrigation.peakDailyWaterM3} m³/day in ${bundle.irrigation.peakMonthName} with an estimated ${bundle.irrigation.peakIrrigationIntervalDays}-day soil depletion interval.`,
    `Solar-Pump Integration: The ${farm.solarConfig.capacityKwp} kWp array produces an estimated ${bundle.solar.annualKwh.toLocaleString()} kWh/yr (PVGIS), covering ${bundle.solarVsPump.annualCoveragePct}% of annual irrigation demand and ${bundle.solarVsPump.worstMonthCoveragePct}% during peak ${bundle.solarVsPump.worstMonthName}. Add a ${bundle.solarVsPump.recommendedWaterStorageTankM3} m³ buffer tank or ${bundle.solarVsPump.recommendedBatteryKwh} kWh battery bank to avoid diurnal mismatch.`,
    `Top Climatic Crop Alternatives: ${bundle.cropSuitability
      .slice(0, 3)
      .map((c) => `${c.cropName} (score ${c.score}/100)`)
      .join(", ")}.`,
  ];

  const sources: DataSourceCitation[] = [
    bundle.weather.citation,
    bundle.climate.citation,
    bundle.elevation.citation,
    bundle.solar.citation,
    ...bundle.waterSources.citations,
    bundle.wapor.citation,
  ];

  const uncertainties: string[] = [
    "Subsurface groundwater depth, aquifer drawdown, and borehole sustainable yield are NOT observable from satellites or OpenStreetMap; hydrogeological testing is required.",
    "Straight-line horizontal distance to mapped water features underestimates actual pipeline routing around parcel boundaries, roads, and elevation ridges.",
    "Soil hydraulic parameters (TAW, infiltration rate) are based on user-selected soil texture defaults unless laboratory soil core analysis is provided.",
    "PVGIS solar estimates reflect long-term typical meteorological years (TMY) and exclude local horizon shading from trees, hills, or structures.",
    "Open-Meteo ERA5 historical climate represents a ~11–25 km grid average over the trailing 365 days rather than a multi-decade drought probability distribution.",
  ];

  const reportId = `rep_${farm.id}_${Date.now()}`;
  const createdAt = new Date().toISOString();

  return {
    id: reportId,
    farmId: farm.id,
    farmName: farm.name,
    title: `Agricultural Land, Water & Solar Feasibility Report — ${farm.name}`,
    overallScore: score,
    verdict,
    executiveSummary: `${metrics.isWaterShort && metrics.peakDailyDemandM3 !== null ? `Yes, if you solve summer water first: water supply too small in ${metrics.peakMonthName} (${metrics.pumpDailySupplyM3} m³/day vs ${metrics.peakDailyDemandM3} m³/day needed). ` : ""}${farm.name} (${farm.areaHectares.toFixed(2)} ha at ${farm.centerLat.toFixed(4)}°, ${farm.centerLon.toFixed(4)}°, ${bundle.elevation.farmElevationM} m ASL) falls in a ${bundle.climate.aridityClass} climate (${bundle.climate.annualPrecipMm} mm/yr rainfall vs. ${bundle.climate.annualEt0Mm} mm/yr ET₀). For ${crop.name} under ${farm.irrigationConfig.irrigationMethod.toLowerCase()} irrigation, annual gross demand is ${bundle.irrigation.annualGrossVolumeM3.toLocaleString()} m³/yr. A ${farm.solarConfig.capacityKwp} kWp PV installation generates an estimated ${bundle.solar.annualKwh.toLocaleString()} kWh/yr, covering ${bundle.solarVsPump.annualCoveragePct}% of annual pump energy (${bundle.solarVsPump.worstMonthCoveragePct}% in peak ${bundle.solarVsPump.worstMonthName}).`,
    propertyOverview: {
      coordinates: { latitude: farm.centerLat, longitude: farm.centerLon },
      areaHectares: farm.areaHectares,
      perimeterMeters: farm.perimeterMeters,
      elevationM: bundle.elevation.farmElevationM,
      slopePct: bundle.elevation.estimatedSlopePct,
      country: farm.country,
      region: farm.region,
      primaryCrop: crop.name,
      soilTexture: farm.soilProfile.textureClass,
    },
    weatherSummary: {
      currentTempC: bundle.weather.current.temperatureC,
      annualPrecipMm: bundle.climate.annualPrecipMm,
      annualEt0Mm: bundle.climate.annualEt0Mm,
      aridityIndex: bundle.climate.aridityIndex,
      aridityClass: bundle.climate.aridityClass,
      activeAlertsCount: bundle.weather.alerts.length,
    },
    waterSummary: {
      nearestSourceName: nearest?.name ?? null,
      nearestSourceType: nearest?.sourceType ?? null,
      nearestDistanceM: nearest?.distanceFromBoundaryM ?? null,
      elevationDiffM: nearest?.elevationDiffFromFarmM ?? null,
      sourcesCount: bundle.waterSources.sources.length,
      hydroBasinId: bundle.waterSources.hydroBasin?.hybasId ?? null,
      disclaimer: bundle.waterSources.mandatoryWarning,
    },
    irrigationAndPumpSummary: {
      annualEtcMm: bundle.irrigation.annualEtcMm,
      annualGrossWaterM3: bundle.irrigation.annualGrossVolumeM3,
      peakDailyWaterM3: bundle.irrigation.peakDailyWaterM3,
      totalDynamicHeadM: bundle.pump.totalDynamicHeadM,
      electricalPowerKw: bundle.pump.electricalPowerKw,
      dailyPumpEnergyKwh: bundle.pump.dailyEnergyKwh,
      annualPumpEnergyKwh: bundle.solarVsPump.annualPumpKwh,
    },
    solarSummary: {
      capacityKwp: farm.solarConfig.capacityKwp,
      annualSolarKwh: bundle.solar.annualKwh,
      annualCoveragePct: bundle.solarVsPump.annualCoveragePct,
      worstMonthName: bundle.solarVsPump.worstMonthName,
      worstMonthCoveragePct: bundle.solarVsPump.worstMonthCoveragePct,
      recommendedBatteryKwh: bundle.solarVsPump.recommendedBatteryKwh,
      recommendedTankM3: bundle.solarVsPump.recommendedWaterStorageTankM3,
    },
    cropSuitability: bundle.cropSuitability.slice(0, 6),
    risks,
    recommendations,
    sources,
    uncertainties,
    createdAt,
  };
}
