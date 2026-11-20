import { fromUrl } from "geotiff";
import { withCache } from "@/lib/cache/memory-cache";
import type { WaPORAnalysisResult, WaPORLayerValue } from "@/types/agri";

interface GismgrRasterItem {
  code: string;
  downloadUrl: string;
  scale?: number;
  offset?: number;
  noDataValue?: number;
  width?: number;
  height?: number;
  affineTransform?: number[];
  measureUnit?: string;
}

const WAPOR_LAYER_DEFS = [
  {
    mapsetCode: "L1-AETI-A",
    caption: "Actual Evapotranspiration & Interception (Global)",
    unit: "mm/year",
    spatialResolution: "300 m (WaPOR Level 1)",
    temporalResolution: "Annual",
  },
  {
    mapsetCode: "L1-RET-A",
    caption: "Reference Evapotranspiration (Global)",
    unit: "mm/year",
    spatialResolution: "~30 km (WaPOR Level 1)",
    temporalResolution: "Annual",
  },
  {
    mapsetCode: "L1-PCP-A",
    caption: "Precipitation (Global CHIRPS/WaPOR)",
    unit: "mm/year",
    spatialResolution: "~5 km (WaPOR Level 1)",
    temporalResolution: "Annual",
  },
  {
    mapsetCode: "L1-TBP-A",
    caption: "Total Biomass Production (Global)",
    unit: "kg/ha/year",
    spatialResolution: "300 m (WaPOR Level 1)",
    temporalResolution: "Annual",
  },
  {
    mapsetCode: "L1-NBWP-A",
    caption: "Net Biomass Water Productivity (Global)",
    unit: "kg/m³",
    spatialResolution: "300 m (WaPOR Level 1)",
    temporalResolution: "Annual",
  },
  {
    mapsetCode: "L2-AETI-A",
    caption: "High-Res Actual ET & Interception (Africa & Near East)",
    unit: "mm/year",
    spatialResolution: "100 m (WaPOR Level 2)",
    temporalResolution: "Annual",
  },
];

async function fetchLatestRasterMeta(
  baseUrl: string,
  mapsetCode: string
): Promise<GismgrRasterItem | null> {
  try {
    const listRes = await fetch(`${baseUrl}/mapsets/${mapsetCode}/rasters`, {
      signal: AbortSignal.timeout(7000),
      headers: { "User-Agent": "AgriIntelligencePlatform/1.0" },
    });
    if (!listRes.ok) return null;
    const listJson = await listRes.json();
    const items: Array<{ code: string; downloadUrl: string }> =
      listJson.response?.items ?? [];
    if (items.length === 0) return null;

    // Pick the most recent full historical year (second-to-last or latest available)
    const target = items[items.length - 1];
    const detailRes = await fetch(
      `${baseUrl}/mapsets/${mapsetCode}/rasters/${target.code}`,
      {
        signal: AbortSignal.timeout(7000),
        headers: { "User-Agent": "AgriIntelligencePlatform/1.0" },
      }
    );
    if (!detailRes.ok) {
      return { code: target.code, downloadUrl: target.downloadUrl };
    }
    const detailJson = await detailRes.json();
    return detailJson.response as GismgrRasterItem;
  } catch {
    return null;
  }
}

async function sampleCogPixel(
  meta: GismgrRasterItem,
  latitude: number,
  longitude: number
): Promise<number | null> {
  if (!meta.downloadUrl || !meta.affineTransform || meta.affineTransform.length < 6) {
    return null;
  }
  const [originX, pixelWidth, , originY, , pixelHeight] = meta.affineTransform;
  const px = Math.floor((longitude - originX) / pixelWidth);
  const py = Math.floor((latitude - originY) / pixelHeight);

  if (
    px < 0 ||
    py < 0 ||
    (meta.width && px >= meta.width) ||
    (meta.height && py >= meta.height)
  ) {
    return null;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 7500);
    const tiff = await fromUrl(meta.downloadUrl, {
      allowFullFile: false,
      signal: controller.signal,
    });
    const image = await tiff.getImage();
    const rasters = await image.readRasters({
      window: [px, py, px + 1, py + 1],
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    const band = rasters[0] as ArrayLike<number> | undefined;
    if (!band || band.length === 0) return null;
    const raw = Number(band[0]);
    const noData = meta.noDataValue ?? -9999;
    if (Number.isNaN(raw) || raw === noData || raw < -9000) return null;

    const scale = meta.scale ?? 1;
    const offset = meta.offset ?? 0;
    return Number((raw * scale + offset).toFixed(3));
  } catch {
    return null;
  }
}

export async function fetchWaPORData(
  latitude: number,
  longitude: number
): Promise<WaPORAnalysisResult> {
  const cacheKey = `wapor_${latitude.toFixed(3)}_${longitude.toFixed(3)}`;

  return withCache(cacheKey, 12 * 60 * 60 * 1000, async () => {
    const baseUrl =
      process.env.WAPOR_API_BASE_URL ||
      "https://data.apps.fao.org/gismgr/api/v2/catalog/workspaces/WAPOR-3";
    const retrievedAt = new Date().toISOString();

    const metas = await Promise.all(
      WAPOR_LAYER_DEFS.map(async (def) => ({
        def,
        meta: await fetchLatestRasterMeta(baseUrl, def.mapsetCode),
      }))
    );

    const sampledLayers: WaPORLayerValue[] = await Promise.all(
      metas.map(async ({ def, meta }) => {
        const year = meta?.code?.split(".").pop() ?? "Latest";
        const sampledValue = meta ? await sampleCogPixel(meta, latitude, longitude) : null;
        return {
          mapsetCode: def.mapsetCode,
          caption: def.caption,
          unit: meta?.measureUnit || def.unit,
          spatialResolution: def.spatialResolution,
          temporalResolution: def.temporalResolution,
          year,
          value: sampledValue,
          provenance: sampledValue !== null ? "OBSERVED" : "MODELED",
          rasterUrl: meta?.downloadUrl ?? `${baseUrl}/mapsets/${def.mapsetCode}`,
          notes:
            sampledValue !== null
              ? "Extracted directly from FAO WaPOR v3 Cloud-Optimized GeoTIFF via HTTP Range request."
              : meta
              ? "Raster catalog verified; pixel outside L2 regional coverage or COG range fetch exceeded timeout."
              : "WaPOR GISMGR catalog request unavailable.",
        };
      })
    );

    const getVal = (code: string) =>
      sampledLayers.find((l) => l.mapsetCode === code)?.value ?? null;

    const aeti = getVal("L1-AETI-A");
    const ret = getVal("L1-RET-A");
    const pcp = getVal("L1-PCP-A");
    const tbp = getVal("L1-TBP-A");
    const nbwp = getVal("L1-NBWP-A");
    const l2Aeti = getVal("L2-AETI-A");

    const relativeEvapotranspiration =
      aeti !== null && ret !== null && ret > 0
        ? Number((aeti / ret).toFixed(2))
        : null;

    const observedCount = sampledLayers.filter((l) => l.value !== null).length;

    return {
      latitude,
      longitude,
      actualEvapotranspirationMmYr: aeti,
      referenceEvapotranspirationMmYr: ret,
      precipitationMmYr: pcp,
      relativeEvapotranspiration,
      totalBiomassProductionKgHa: tbp,
      netBiomassWaterProductivityKgM3: nbwp,
      l2HighResAetiMmYr: l2Aeti,
      l2CoverageAvailable: l2Aeti !== null,
      layers: sampledLayers,
      citation: {
        id: "fao_wapor_v3",
        name: "FAO WaPOR v3 Remote Sensing Water Productivity",
        provider: "Food and Agriculture Organization (FAO GISMGR v2)",
        provenance: observedCount > 0 ? "OBSERVED" : "MODELED",
        retrievedAt,
        spatialResolution:
          l2Aeti !== null
            ? "100 m (WaPOR L2) / 300 m (WaPOR L1)"
            : "300 m (WaPOR L1 Global) / ~5 km (Precipitation) / ~30 km (RET)",
        temporalResolution: "Annual (2018–2025)",
        url: "https://www.fao.org/in-action/remote-sensing-for-water-productivity/wapor-data/en",
        limitations:
          "WaPOR v3 Level 1 AETI/TBP pixels represent 300 m × 300 m mixed land-cover averages (which may blend adjacent roads or buildings), while Level 2 (100 m) covers Africa & Near East only. Precipitation (~5 km) and Reference ET (~30 km) are coarse regional grids.",
      },
      limitations:
        "WaPOR satellite ET reflects actual vegetated land cover at 100–300 m resolution; fallow or bare land shows low AETI even in fertile soils, and Level 2 100 m layers cover Africa and the Near East only.",
    };
  });
}
