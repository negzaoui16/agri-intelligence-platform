import { withCache } from "@/lib/cache/memory-cache";
import type { MonthlySolarProduction, SolarAnalysisResult } from "@/types/agri";

const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

export interface PVGISQueryParams {
  latitude: number;
  longitude: number;
  capacityKwp: number;
  tiltDeg: number;
  azimuthDeg: number;
  mountingType: "free" | "building";
  systemLossPct: number;
  optimizeAngles?: boolean;
}

export async function fetchPVGISSolarAnalysis(
  params: PVGISQueryParams
): Promise<SolarAnalysisResult> {
  const cacheKey = `pvgis_${params.latitude.toFixed(3)}_${params.longitude.toFixed(3)}_${params.capacityKwp}_${params.tiltDeg}_${params.azimuthDeg}_${params.mountingType}_${params.systemLossPct}_${params.optimizeAngles ? 1 : 0}`;

  return withCache(cacheKey, 6 * 60 * 60 * 1000, async () => {
    const baseUrl =
      process.env.PVGIS_API_BASE_URL || "https://re.jrc.ec.europa.eu/api/v5_3";
    const url = new URL(`${baseUrl}/PVcalc`);
    url.searchParams.set("lat", params.latitude.toFixed(4));
    url.searchParams.set("lon", params.longitude.toFixed(4));
    url.searchParams.set("peakpower", String(params.capacityKwp));
    url.searchParams.set("loss", String(params.systemLossPct));
    url.searchParams.set("angle", String(params.tiltDeg));
    url.searchParams.set("aspect", String(params.azimuthDeg));
    url.searchParams.set("mountingplace", params.mountingType);
    url.searchParams.set("optimalangles", params.optimizeAngles ? "1" : "0");
    url.searchParams.set("outputformat", "json");

    try {
      const res = await fetch(url.toString(), {
        signal: AbortSignal.timeout(15_000),
        headers: { "User-Agent": "AgriIntelligencePlatform/1.0" },
      });

      if (!res.ok) {
        const bodyText = await res.text();
        throw new Error(`PVGIS HTTP ${res.status}: ${bodyText.slice(0, 160)}`);
      }

      const json = await res.json();
      const retrievedAt = new Date().toISOString();
      const monthlyRaw: Array<Record<string, number>> = json.outputs?.monthly?.fixed ?? [];
      const totals = json.outputs?.totals?.fixed ?? {};
      const mountingInfo = json.inputs?.mounting_system?.fixed ?? {};

      if (monthlyRaw.length !== 12) {
        throw new Error("PVGIS returned incomplete monthly series");
      }

      const monthly: MonthlySolarProduction[] = monthlyRaw.map((m, idx) => ({
        monthIndex: Number(m.month ?? idx + 1),
        monthName: MONTH_NAMES[(Number(m.month ?? idx + 1) - 1) % 12],
        dailyAvgKwh: Number((m.E_d ?? 0).toFixed(2)),
        monthlyKwh: Number((m.E_m ?? 0).toFixed(1)),
        inPlaneIrradiationDailyKwhM2: Number((m["H(i)_d"] ?? 0).toFixed(2)),
        inPlaneIrradiationMonthlyKwhM2: Number((m["H(i)_m"] ?? 0).toFixed(1)),
        interAnnualSdKwh: Number((m.SD_m ?? 0).toFixed(1)),
      }));

      const annualKwh = Number((totals.E_y ?? monthly.reduce((s, m) => s + m.monthlyKwh, 0)).toFixed(1));
      const dailyAvgKwh = Number((totals.E_d ?? annualKwh / 365).toFixed(2));
      const monthlyAvgKwh = Number((totals.E_m ?? annualKwh / 12).toFixed(1));

      const seasonDefs: Array<{
        season: "Winter" | "Spring" | "Summer" | "Autumn";
        indices: number[];
      }> = [
        { season: "Winter", indices: [12, 1, 2] },
        { season: "Spring", indices: [3, 4, 5] },
        { season: "Summer", indices: [6, 7, 8] },
        { season: "Autumn", indices: [9, 10, 11] },
      ];

      const seasonal = seasonDefs.map((def) => {
        const kwh = Number(
          monthly
            .filter((m) => def.indices.includes(m.monthIndex))
            .reduce((s, m) => s + m.monthlyKwh, 0)
            .toFixed(1)
        );
        return {
          season: def.season,
          kwh,
          sharePct: annualKwh > 0 ? Number(((kwh / annualKwh) * 100).toFixed(1)) : 0,
        };
      });

      const resolvedTilt =
        mountingInfo.slope?.value !== undefined
          ? Number(mountingInfo.slope.value)
          : params.tiltDeg;
      const resolvedAzimuth =
        mountingInfo.azimuth?.value !== undefined
          ? Number(mountingInfo.azimuth.value)
          : params.azimuthDeg;

      return {
        latitude: params.latitude,
        longitude: params.longitude,
        capacityKwp: params.capacityKwp,
        tiltDeg: resolvedTilt,
        azimuthDeg: resolvedAzimuth,
        mountingType: params.mountingType,
        systemLossPct: params.systemLossPct,
        dailyAvgKwh,
        monthlyAvgKwh,
        annualKwh,
        specificYieldKwhPerKwp: Number((annualKwh / Math.max(0.1, params.capacityKwp)).toFixed(0)),
        optimalTiltDeg: params.optimizeAngles
          ? resolvedTilt
          : Number(Math.min(55, Math.max(10, Math.round(Math.abs(params.latitude) * 0.87)))),
        optimalAzimuthDeg: params.latitude >= 0 ? 0 : 180,
        lossesBreakdown: {
          angleOfIncidencePct: totals.l_aoi !== undefined ? Number(totals.l_aoi) : null,
          spectralPct: totals.l_spec !== undefined ? Number(totals.l_spec) : null,
          temperatureAndIrradiancePct: totals.l_tg !== undefined ? Number(totals.l_tg) : null,
          totalLossPct: Number(
            totals.l_total !== undefined ? Math.abs(Number(totals.l_total)) : params.systemLossPct
          ),
        },
        monthly,
        seasonal,
        isEstimatedFallback: false,
        citation: {
          id: "jrc_pvgis_v53",
          name: "European Commission JRC PVGIS v5.3 Solar Calculator",
          provider: "European Commission Joint Research Centre (PVGIS)",
          provenance: "MODELED",
          retrievedAt,
          spatialResolution: "~3–5 km satellite solar irradiance (SARAH-3 / ERA5)",
          temporalResolution: "Long-term TMY monthly & annual PV simulation",
          url: "https://photovoltaic-geographic-information-system.ec.europa.eu/api/v6/docs",
          limitations:
            "Estimated PV yield only (not metered generation). Does not model local horizon shading from buildings/trees, dust soiling beyond configured system loss, or inverter clipping.",
        },
      };
    } catch (err) {
      // Fallback using Open-Meteo Historical Shortwave Solar Radiation if PVGIS rejects ocean/polar edge or times out
      const archiveUrl =
        process.env.OPEN_METEO_ARCHIVE_URL || "https://archive-api.open-meteo.com/v1";
      const end = new Date(Date.now() - 7 * 86_400_000);
      const start = new Date(end.getTime() - 364 * 86_400_000);
      const omRes = await fetch(
        `${archiveUrl}/archive?latitude=${params.latitude}&longitude=${params.longitude}&start_date=${start.toISOString().slice(0, 10)}&end_date=${end.toISOString().slice(0, 10)}&daily=shortwave_radiation_sum&timezone=auto`,
        { signal: AbortSignal.timeout(10_000) }
      );
      if (!omRes.ok) {
        throw err;
      }
      const omJson = await omRes.json();
      const retrievedAt = new Date().toISOString();
      const dates: string[] = omJson.daily?.time ?? [];
      const rads: number[] = omJson.daily?.shortwave_radiation_sum ?? [];

      const monthSums = Array.from({ length: 12 }, () => ({ sum: 0, count: 0 }));
      for (let i = 0; i < dates.length; i++) {
        const mIdx = Number(dates[i].slice(5, 7)) - 1;
        if (mIdx >= 0 && mIdx < 12) {
          monthSums[mIdx].sum += Number(rads[i] ?? 0);
          monthSums[mIdx].count += 1;
        }
      }

      const performanceRatio = Math.max(0.5, 1 - params.systemLossPct / 100) * 0.92;
      const monthly: MonthlySolarProduction[] = monthSums.map((b, idx) => {
        const avgMjDay = b.count > 0 ? b.sum / b.count : 16;
        const ghiKwhM2Day = avgMjDay / 3.6;
        // Approximate tilt gain factor
        const tiltBoost = 1 + Math.sin((params.tiltDeg * Math.PI) / 180) * 0.08;
        const poaDaily = ghiKwhM2Day * tiltBoost;
        const dailyAvgKwh = Number((params.capacityKwp * poaDaily * performanceRatio).toFixed(2));
        const days = DAYS_IN_MONTH[idx];
        return {
          monthIndex: idx + 1,
          monthName: MONTH_NAMES[idx],
          dailyAvgKwh,
          monthlyKwh: Number((dailyAvgKwh * days).toFixed(1)),
          inPlaneIrradiationDailyKwhM2: Number(poaDaily.toFixed(2)),
          inPlaneIrradiationMonthlyKwhM2: Number((poaDaily * days).toFixed(1)),
          interAnnualSdKwh: Number((dailyAvgKwh * days * 0.06).toFixed(1)),
        };
      });

      const annualKwh = Number(monthly.reduce((s, m) => s + m.monthlyKwh, 0).toFixed(1));
      const seasonal = [
        { season: "Winter" as const, indices: [12, 1, 2] },
        { season: "Spring" as const, indices: [3, 4, 5] },
        { season: "Summer" as const, indices: [6, 7, 8] },
        { season: "Autumn" as const, indices: [9, 10, 11] },
      ].map((def) => {
        const kwh = Number(
          monthly
            .filter((m) => def.indices.includes(m.monthIndex))
            .reduce((s, m) => s + m.monthlyKwh, 0)
            .toFixed(1)
        );
        return {
          season: def.season,
          kwh,
          sharePct: annualKwh > 0 ? Number(((kwh / annualKwh) * 100).toFixed(1)) : 0,
        };
      });

      return {
        latitude: params.latitude,
        longitude: params.longitude,
        capacityKwp: params.capacityKwp,
        tiltDeg: params.tiltDeg,
        azimuthDeg: params.azimuthDeg,
        mountingType: params.mountingType,
        systemLossPct: params.systemLossPct,
        dailyAvgKwh: Number((annualKwh / 365).toFixed(2)),
        monthlyAvgKwh: Number((annualKwh / 12).toFixed(1)),
        annualKwh,
        specificYieldKwhPerKwp: Number((annualKwh / Math.max(0.1, params.capacityKwp)).toFixed(0)),
        optimalTiltDeg: Math.round(Math.abs(params.latitude) * 0.87),
        optimalAzimuthDeg: params.latitude >= 0 ? 0 : 180,
        lossesBreakdown: {
          angleOfIncidencePct: null,
          spectralPct: null,
          temperatureAndIrradiancePct: null,
          totalLossPct: params.systemLossPct,
        },
        monthly,
        seasonal,
        isEstimatedFallback: true,
        citation: {
          id: "open_meteo_solar_fallback",
          name: "Open-Meteo Shortwave Irradiance Fallback Model",
          provider: "Open-Meteo ERA5 (PVGIS Fallback)",
          provenance: "MODELED",
          retrievedAt,
          spatialResolution: "~11–25 km ERA5 grid",
          limitations: `PVGIS returned an error (${err instanceof Error ? err.message : "unavailable"}); estimated from Open-Meteo horizontal irradiance with simplified tilt adjustment.`,
        },
      };
    }
  });
}
