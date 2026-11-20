import * as turf from "@turf/turf";
import { withCache } from "@/lib/cache/memory-cache";
import { compassDirection } from "@/lib/utils";
import type {
  GeoPolygon,
  HydroBasinContext,
  WaterSourceFeature,
  WaterSourcesResult,
  WaterSourceType,
} from "@/types/agri";
import { fetchBatchElevations } from "./elevation";

const MANDATORY_WATER_DISCLAIMER =
  "A mapped river, stream, reservoir, or well indicates geographic location in public datasets only. It does NOT confirm water availability, seasonal flow, water quality, borehole yield, or legal abstraction rights.";

function mapOsmTagsToSourceType(tags: Record<string, string>): {
  type: WaterSourceType;
  label: string;
} {
  if (tags.waterway === "river") return { type: "RIVER", label: "River" };
  if (tags.waterway === "stream") return { type: "STREAM", label: "Stream" };
  if (tags.waterway === "canal" || tags.waterway === "ditch")
    return { type: "CANAL", label: "Irrigation Canal / Ditch" };
  if (tags.natural === "water") {
    if (tags.water === "reservoir") return { type: "RESERVOIR", label: "Reservoir" };
    return { type: "LAKE", label: "Lake / Pond" };
  }
  if (tags.landuse === "reservoir") return { type: "RESERVOIR", label: "Reservoir" };
  if (tags.man_made === "water_well") return { type: "WELL", label: "Mapped Well / Borehole" };
  if (tags.natural === "spring") return { type: "SPRING", label: "Natural Spring" };
  return { type: "WATER_INFRASTRUCTURE", label: "Water Infrastructure" };
}

function classifySpatialRelationship(
  distanceFromBoundaryM: number,
  isInside: boolean
): WaterSourceFeature["spatialRelationship"] {
  if (isInside) return "INSIDE_BOUNDARY";
  if (distanceFromBoundaryM <= 100) return "ADJACENT_<100M";
  if (distanceFromBoundaryM <= 1000) return "NEARBY_<1KM";
  if (distanceFromBoundaryM <= 10000) return "REGIONAL_1_10KM";
  return "DISTANT_>10KM";
}

async function queryOverpassWaterFeatures(
  latitude: number,
  longitude: number,
  radiusMeters: number
): Promise<
  Array<{
    externalId: string;
    name: string;
    sourceType: WaterSourceType;
    latitude: number;
    longitude: number;
    tags: Record<string, string>;
  }>
> {
  const latDelta = Math.min(0.25, radiusMeters / 111_000);
  const cosLat = Math.max(0.2, Math.cos((latitude * Math.PI) / 180));
  const lonDelta = Math.min(0.35, radiusMeters / (111_000 * cosLat));

  const minLat = (latitude - latDelta).toFixed(5);
  const minLon = (longitude - lonDelta).toFixed(5);
  const maxLat = (latitude + latDelta).toFixed(5);
  const maxLon = (longitude + lonDelta).toFixed(5);
  const bbox = `${minLat},${minLon},${maxLat},${maxLon}`;

  const ql = `[out:json][timeout:12];(way["waterway"="river"](${bbox});way["waterway"="stream"](${bbox});way["waterway"="canal"](${bbox});way["natural"="water"](${bbox});node["man_made"="water_well"](${bbox});node["natural"="spring"](${bbox});node["man_made"="water_tower"](${bbox}););out center 40;`;

  const configuredMirrors = (
    process.env.OVERPASS_API_URLS ||
    "https://overpass.openstreetmap.fr/api/interpreter,https://overpass-api.de/api/interpreter,https://lz4.overpass-api.de/api/interpreter"
  )
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  for (const endpoint of configuredMirrors) {
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        signal: AbortSignal.timeout(5_000),
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": "AgriIntelligencePlatform/1.0",
        },
        body: `data=${encodeURIComponent(ql)}`,
      });
      if (!res.ok) continue;
      const json = await res.json();
      const elements: Array<{
        type: string;
        id: number;
        lat?: number;
        lon?: number;
        center?: { lat: number; lon: number };
        tags?: Record<string, string>;
      }> = json.elements ?? [];

      return elements
        .map((el) => {
          const lat = el.lat ?? el.center?.lat;
          const lon = el.lon ?? el.center?.lon;
          if (lat === undefined || lon === undefined) return null;
          const tags = el.tags ?? {};
          const mapped = mapOsmTagsToSourceType(tags);
          return {
            externalId: `osm_${el.type}_${el.id}`,
            name: tags.name || tags["name:en"] || `Unnamed ${mapped.label}`,
            sourceType: mapped.type,
            latitude: lat,
            longitude: lon,
            tags,
          };
        })
        .filter((item): item is NonNullable<typeof item> => item !== null);
    } catch {
      // Try next mirror
    }
  }

  return [];
}

async function queryNominatimWaterFeatures(
  latitude: number,
  longitude: number,
  radiusMeters: number
): Promise<
  Array<{
    externalId: string;
    name: string;
    sourceType: WaterSourceType;
    latitude: number;
    longitude: number;
    tags: Record<string, string>;
  }>
> {
  const latDelta = Math.min(0.25, radiusMeters / 111_000);
  const cosLat = Math.max(0.2, Math.cos((latitude * Math.PI) / 180));
  const lonDelta = Math.min(0.35, radiusMeters / (111_000 * cosLat));
  const viewbox = `${(longitude - lonDelta).toFixed(4)},${(latitude + latDelta).toFixed(4)},${(longitude + lonDelta).toFixed(4)},${(latitude - latDelta).toFixed(4)}`;

  const terms = ["river", "stream", "dam", "reservoir", "canal", "spring"];
  const results = await Promise.allSettled(
    terms.map(async (term) => {
      const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${term}&viewbox=${viewbox}&bounded=1&limit=8`;
      const res = await fetch(url, {
        signal: AbortSignal.timeout(6_000),
        headers: {
          "User-Agent": "AgriIntelligencePlatform/1.0 (+https://terrapulse.local)",
          Accept: "application/json",
        },
      });
      if (!res.ok) return [];
      return (await res.json()) as Array<{
        osm_type?: string;
        osm_id?: number;
        lat: string;
        lon: string;
        display_name: string;
        name?: string;
        category?: string;
        type?: string;
      }>;
    })
  );

  const validTypes = new Set([
    "river",
    "stream",
    "canal",
    "dam",
    "reservoir",
    "water",
    "spring",
    "weir",
    "ditch",
    "water_well",
  ]);
  const mapped: Array<{
    externalId: string;
    name: string;
    sourceType: WaterSourceType;
    latitude: number;
    longitude: number;
    tags: Record<string, string>;
  }> = [];

  for (const r of results) {
    if (r.status !== "fulfilled") continue;
    for (const item of r.value) {
      const t = item.type || "";
      if (item.category !== "waterway" && item.category !== "natural" && !validTypes.has(t)) {
        continue;
      }
      if (item.category === "natural" && !validTypes.has(t)) continue;

      let sourceType: WaterSourceType = "WATER_INFRASTRUCTURE";
      if (t === "river") sourceType = "RIVER";
      else if (t === "stream") sourceType = "STREAM";
      else if (t === "canal" || t === "ditch") sourceType = "CANAL";
      else if (t === "dam" || t === "reservoir") sourceType = "RESERVOIR";
      else if (t === "water") sourceType = "LAKE";
      else if (t === "spring") sourceType = "SPRING";
      else if (t === "water_well") sourceType = "WELL";

      mapped.push({
        externalId: `osm_${item.osm_type || "node"}_${item.osm_id || Math.random()}`,
        name: item.name || item.display_name.split(",")[0] || `OSM ${sourceType}`,
        sourceType,
        latitude: Number(item.lat),
        longitude: Number(item.lon),
        tags: { category: item.category || "", type: t },
      });
    }
  }

  return mapped;
}

async function queryHydroBasinsContext(
  latitude: number,
  longitude: number
): Promise<{
  hydroBasin: HydroBasinContext | null;
  majorRivers: Array<{
    externalId: string;
    name: string;
    latitude: number;
    longitude: number;
    tags: Record<string, string>;
  }>;
}> {
  const retrievedAt = new Date().toISOString();
  const baseBasinUrl =
    process.env.HYDROBASINS_API_URL ||
    "https://services.arcgis.com/v01gqwM5QqNysAAi/arcgis/rest/services/Hydrobasins/FeatureServer/0";
  const demandBasinUrl =
    process.env.HYDROBASINS_DEMAND_API_URL ||
    "https://services1.arcgis.com/hLJbHVT9ZrDIzK0I/arcgis/rest/services/hydrobasins_lvl7_base_jinnan/FeatureServer/0";

  const [basinRes, demandRes, majorRiversRes] = await Promise.allSettled([
    fetch(
      `${baseBasinUrl}/query?geometry=${longitude},${latitude}&geometryType=esriGeometryPoint&inSR=4326&spatialRel=esriSpatialRelIntersects&outFields=*&returnGeometry=false&f=json`,
      { signal: AbortSignal.timeout(8000) }
    ).then((r) => (r.ok ? r.json() : null)),
    fetch(
      `${demandBasinUrl}/query?geometry=${longitude},${latitude}&geometryType=esriGeometryPoint&inSR=4326&spatialRel=esriSpatialRelIntersects&outFields=basinid,geodesic_area,irrigation_gross_demand_current,irrigation_water_gap_current,irrigation_water_withdrawal_cur&returnGeometry=false&f=json`,
      { signal: AbortSignal.timeout(8000) }
    ).then((r) => (r.ok ? r.json() : null)),
    fetch(
      `https://services4.arcgis.com/9lICIlhSEuRFezSF/arcgis/rest/services/Major_World_Rivers/FeatureServer/0/query?geometry=${longitude - 0.5},${latitude - 0.5},${longitude + 0.5},${latitude + 0.5}&geometryType=esriGeometryEnvelope&inSR=4326&spatialRel=esriSpatialRelIntersects&outFields=OBJECTID,NAME,Length_KM,name_en&returnGeometry=true&outSR=4326&f=json`,
      { signal: AbortSignal.timeout(8000) }
    ).then((r) => (r.ok ? r.json() : null)),
  ]);

  const bAttrs =
    basinRes.status === "fulfilled" ? basinRes.value?.features?.[0]?.attributes : null;
  const dAttrs =
    demandRes.status === "fulfilled" ? demandRes.value?.features?.[0]?.attributes : null;

  const hydroBasin: HydroBasinContext | null =
    bAttrs || dAttrs
      ? {
          hybasId: bAttrs?.HYBAS_ID ? String(bAttrs.HYBAS_ID) : dAttrs?.basinid ? String(dAttrs.basinid) : null,
          pfafstetterId: bAttrs?.PFAF_ID ? String(bAttrs.PFAF_ID) : null,
          subBasinAreaKm2:
            bAttrs?.SUB_AREA !== undefined
              ? Number(bAttrs.SUB_AREA)
              : dAttrs?.geodesic_area !== undefined
              ? Number(Number(dAttrs.geodesic_area).toFixed(1))
              : null,
          upstreamAreaKm2: bAttrs?.UP_AREA !== undefined ? Number(bAttrs.UP_AREA) : null,
          distanceToSinkKm: bAttrs?.DIST_SINK !== undefined ? Number(bAttrs.DIST_SINK) : null,
          isEndorheic: bAttrs?.ENDO !== undefined ? Number(bAttrs.ENDO) > 0 : null,
          irrigationGrossDemand:
            dAttrs?.irrigation_gross_demand_current !== undefined
              ? Number(Number(dAttrs.irrigation_gross_demand_current).toFixed(2))
              : null,
          irrigationWaterGap:
            dAttrs?.irrigation_water_gap_current !== undefined
              ? Number(Number(dAttrs.irrigation_water_gap_current).toFixed(2))
              : null,
          irrigationWithdrawal:
            dAttrs?.irrigation_water_withdrawal_cur !== undefined
              ? Number(Number(dAttrs.irrigation_water_withdrawal_cur).toFixed(2))
              : null,
          citation: {
            id: "hydrosheds_hydrobasins",
            name: "HydroSHEDS / HydroBASINS Watershed Atlas",
            provider: "WWF HydroSHEDS & ArcGIS Hosted Feature Services",
            provenance: "OBSERVED",
            retrievedAt,
            spatialResolution: "HydroBASINS Level 3–7 watershed polygons & HydroRIVERS network",
            url: "https://www.hydrosheds.org/",
            limitations:
              "Regional basin statistics reflect watershed-scale aggregates and cannot determine plot-level water rights or seasonal stream intermittency.",
          },
        }
      : null;

  const majorRiversRaw: Array<{
    attributes?: { OBJECTID?: number; NAME?: string; name_en?: string; Length_KM?: number };
    geometry?: { paths?: number[][][] };
  }> = majorRiversRes.status === "fulfilled" ? majorRiversRes.value?.features ?? [] : [];

  const majorRivers = majorRiversRaw
    .map((feat, idx) => {
      const path = feat.geometry?.paths?.[0];
      if (!path || path.length === 0) return null;
      // Find closest vertex on river polyline to farm point
      let bestPt = path[0];
      let bestDist = Infinity;
      for (const coord of path) {
        const d = turf.distance(
          turf.point([longitude, latitude]),
          turf.point([coord[0], coord[1]]),
          { units: "meters" }
        );
        if (d < bestDist) {
          bestDist = d;
          bestPt = coord;
        }
      }
      return {
        externalId: `hydrorivers_${feat.attributes?.OBJECTID ?? idx}`,
        name:
          feat.attributes?.name_en ||
          feat.attributes?.NAME ||
          "Major Regional River (HydroSHEDS)",
        latitude: bestPt[1],
        longitude: bestPt[0],
        tags: {
          dataset: "HydroSHEDS / Major World Rivers",
          length_km: String(feat.attributes?.Length_KM ?? ""),
        },
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  return { hydroBasin, majorRivers };
}

export async function fetchNearbyWaterSources(
  latitude: number,
  longitude: number,
  radiusMeters = 10000,
  boundary?: GeoPolygon | null
): Promise<WaterSourcesResult> {
  const clampedRadius = Math.min(30000, Math.max(500, radiusMeters));
  const cacheKey = `water_${latitude.toFixed(3)}_${longitude.toFixed(3)}_${clampedRadius}`;

  return withCache(cacheKey, 60 * 60 * 1000, async () => {
    const retrievedAt = new Date().toISOString();
    const [osmFeatures, nominatimFeatures, hydroData] = await Promise.all([
      queryOverpassWaterFeatures(latitude, longitude, clampedRadius),
      queryNominatimWaterFeatures(latitude, longitude, clampedRadius),
      queryHydroBasinsContext(latitude, longitude),
    ]);

    const seenIds = new Set<string>();
    const combinedRaw: Array<{
      externalId: string;
      name: string;
      sourceType: WaterSourceType;
      latitude: number;
      longitude: number;
      tags: Record<string, string>;
      provider: "OSM_OVERPASS" | "HYDRORIVERS";
    }> = [];

    for (const f of [...osmFeatures, ...nominatimFeatures]) {
      if (seenIds.has(f.externalId)) continue;
      seenIds.add(f.externalId);
      combinedRaw.push({ ...f, provider: "OSM_OVERPASS" as const });
    }
    for (const f of hydroData.majorRivers) {
      if (seenIds.has(f.externalId)) continue;
      seenIds.add(f.externalId);
      combinedRaw.push({
        ...f,
        sourceType: "RIVER" as const,
        provider: "HYDRORIVERS" as const,
      });
    }

    const farmPt = turf.point([longitude, latitude]);
    const farmPoly =
      boundary && boundary.type === "Polygon" && boundary.coordinates[0]?.length >= 4
        ? turf.polygon(boundary.coordinates)
        : null;

    // Batch-fetch elevations for farm center + candidate water features
    const limited = combinedRaw.slice(0, 35);
    let elevations: number[] = [];
    try {
      elevations = await fetchBatchElevations([
        { latitude, longitude },
        ...limited.map((f) => ({ latitude: f.latitude, longitude: f.longitude })),
      ]);
    } catch {
      elevations = [];
    }
    const farmElev = elevations[0] ?? null;

    const features: WaterSourceFeature[] = limited
      .map((item, idx) => {
        const srcPt = turf.point([item.longitude, item.latitude]);
        const distanceFromCentroidM = Math.round(
          turf.distance(farmPt, srcPt, { units: "meters" })
        );
        const bearingRaw = turf.bearing(farmPt, srcPt);
        const bearingDegrees = Math.round(((bearingRaw % 360) + 360) % 360);

        let isInside = false;
        let distanceFromBoundaryM = distanceFromCentroidM;
        if (farmPoly) {
          isInside = turf.booleanPointInPolygon(srcPt, farmPoly);
          if (isInside) {
            distanceFromBoundaryM = 0;
          } else {
            try {
              const distKm = turf.pointToPolygonDistance(srcPt, farmPoly, {
                units: "kilometers",
              });
              distanceFromBoundaryM = Math.max(0, Math.round(distKm * 1000));
            } catch {
              distanceFromBoundaryM = distanceFromCentroidM;
            }
          }
        }

        const elevM =
          elevations.length > idx + 1 ? Number(elevations[idx + 1].toFixed(1)) : null;
        const elevationDiffFromFarmM =
          farmElev !== null && elevM !== null
            ? Number((farmElev - elevM).toFixed(1))
            : null;

        const isWellOrSpring = item.sourceType === "WELL" || item.sourceType === "SPRING";
        const confidence =
          item.provider === "HYDRORIVERS"
            ? "MEDIUM (HydroSHEDS Major River Network)"
            : isWellOrSpring
            ? "LOW (Crowdsourced OSM Point — Field & Yield Verification Required)"
            : "MEDIUM (OpenStreetMap Mapped Surface Water Feature)";

        return {
          id: `${item.provider.toLowerCase()}_${item.externalId}`,
          externalId: item.externalId,
          name: item.name,
          sourceType: item.sourceType,
          provider: item.provider,
          latitude: item.latitude,
          longitude: item.longitude,
          distanceFromCentroidM,
          distanceFromBoundaryM,
          bearingDegrees,
          cardinalDirection: compassDirection(bearingDegrees),
          spatialRelationship: classifySpatialRelationship(distanceFromBoundaryM, isInside),
          elevationM: elevM,
          elevationDiffFromFarmM,
          confidence,
          operationalVerified: false as const,
          disclaimer: MANDATORY_WATER_DISCLAIMER,
          tags: item.tags,
          retrievedAt,
        };
      })
      .sort((a, b) => a.distanceFromCentroidM - b.distanceFromCentroidM);

    const citations = [
      {
        id: "osm_overpass",
        name: "OpenStreetMap Overpass Hydrography & Wells",
        provider: "OpenStreetMap Contributors",
        provenance: "OBSERVED" as const,
        retrievedAt,
        spatialResolution: "Vector features (rivers, streams, canals, reservoirs, wells)",
        url: "https://www.openstreetmap.org/",
        limitations:
          "OpenStreetMap coverage varies by region; unmapped private boreholes or ephemeral seasonal wadis may exist, and mapped wells may be dry or decommissioned.",
      },
      ...(hydroData.hydroBasin ? [hydroData.hydroBasin.citation] : []),
    ];

    return {
      latitude,
      longitude,
      searchRadiusM: clampedRadius,
      nearestSource: features[0] ?? null,
      sources: features,
      hydroBasin: hydroData.hydroBasin,
      citations,
      mandatoryWarning: MANDATORY_WATER_DISCLAIMER,
      retrievedAt,
    };
  });
}
