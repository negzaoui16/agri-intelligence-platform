import { withCache } from "@/lib/cache/memory-cache";
import { compassDirection } from "@/lib/utils";
import type { ElevationResult } from "@/types/agri";

/**
 * Batch-fetches Copernicus DEM GLO-90 (90m) elevations from Open-Meteo Elevation API.
 */
export async function fetchBatchElevations(
  points: Array<{ latitude: number; longitude: number }>
): Promise<number[]> {
  if (points.length === 0) return [];
  const baseUrl = process.env.OPEN_METEO_BASE_URL || "https://api.open-meteo.com/v1";

  const chunks: Array<Array<{ latitude: number; longitude: number }>> = [];
  for (let i = 0; i < points.length; i += 80) {
    chunks.push(points.slice(i, i + 80));
  }

  const results: number[] = [];
  for (const chunk of chunks) {
    const lats = chunk.map((p) => p.latitude.toFixed(5)).join(",");
    const lons = chunk.map((p) => p.longitude.toFixed(5)).join(",");
    const url = `${baseUrl}/elevation?latitude=${lats}&longitude=${lons}`;

    const res = await fetch(url, {
      signal: AbortSignal.timeout(10_000),
      headers: { "User-Agent": "AgriIntelligencePlatform/1.0" },
    });
    if (!res.ok) {
      throw new Error(`Open-Meteo Elevation API returned HTTP ${res.status}`);
    }
    const json = await res.json();
    const elevations: number[] = Array.isArray(json.elevation) ? json.elevation : [];
    for (let i = 0; i < chunk.length; i++) {
      results.push(Number(elevations[i] ?? 0));
    }
  }
  return results;
}

export async function fetchElevationProfile(
  latitude: number,
  longitude: number,
  boundaryRing?: number[][]
): Promise<ElevationResult> {
  const cacheKey = `elev_${latitude.toFixed(4)}_${longitude.toFixed(4)}_${boundaryRing?.length ?? 0}`;

  return withCache(cacheKey, 24 * 60 * 60 * 1000, async () => {
    const deltaDeg = 0.00225; // ~250 m cardinal offset
    const cosLat = Math.max(0.2, Math.cos((latitude * Math.PI) / 180));
    const deltaLon = deltaDeg / cosLat;

    const queryPoints: Array<{ label: string; latitude: number; longitude: number }> = [
      { label: "Farm Center", latitude, longitude },
      { label: "North (+250m)", latitude: Math.min(89.9, latitude + deltaDeg), longitude },
      { label: "South (-250m)", latitude: Math.max(-89.9, latitude - deltaDeg), longitude },
      { label: "East (+250m)", latitude, longitude: Math.min(179.9, longitude + deltaLon) },
      { label: "West (-250m)", latitude, longitude: Math.max(-179.9, longitude - deltaLon) },
    ];

    if (boundaryRing && boundaryRing.length >= 3) {
      const sampleStep = Math.max(1, Math.floor(boundaryRing.length / 8));
      for (let i = 0; i < boundaryRing.length - 1; i += sampleStep) {
        queryPoints.push({
          label: `Boundary Vertex ${i + 1}`,
          latitude: boundaryRing[i][1],
          longitude: boundaryRing[i][0],
        });
      }
    }

    const elevations = await fetchBatchElevations(queryPoints);
    const retrievedAt = new Date().toISOString();

    const samplePoints = queryPoints.map((pt, idx) => ({
      ...pt,
      elevationM: Number((elevations[idx] ?? 0).toFixed(1)),
    }));

    const farmElevationM = samplePoints[0]?.elevationM ?? 0;
    const zNorth = samplePoints[1]?.elevationM ?? farmElevationM;
    const zSouth = samplePoints[2]?.elevationM ?? farmElevationM;
    const zEast = samplePoints[3]?.elevationM ?? farmElevationM;
    const zWest = samplePoints[4]?.elevationM ?? farmElevationM;

    // Gradient over 500m span
    const dzDy = (zNorth - zSouth) / 500;
    const dzDx = (zEast - zWest) / 500;
    const slopePct = Number((Math.sqrt(dzDx * dzDx + dzDy * dzDy) * 100).toFixed(2));

    // Downslope aspect direction (direction water flows)
    const downAngleRad = Math.atan2(-dzDx, -dzDy);
    const downDeg = ((downAngleRad * 180) / Math.PI + 360) % 360;
    const slopeAspect = slopePct < 0.3 ? "Flat / Level" : `${compassDirection(downDeg)}-facing`;

    const allZ = samplePoints.map((p) => p.elevationM);
    const fieldMinElevationM = Math.min(...allZ);
    const fieldMaxElevationM = Math.max(...allZ);

    return {
      farmLatitude: latitude,
      farmLongitude: longitude,
      farmElevationM,
      fieldMinElevationM,
      fieldMaxElevationM,
      fieldReliefM: Number((fieldMaxElevationM - fieldMinElevationM).toFixed(1)),
      estimatedSlopePct: slopePct,
      slopeAspect,
      samplePoints,
      citation: {
        id: "open_meteo_elevation",
        name: "Copernicus DEM GLO-90 Elevation Model",
        provider: "Open-Meteo Elevation API / Copernicus DEM",
        provenance: "OBSERVED",
        retrievedAt,
        spatialResolution: "90 m digital surface elevation grid",
        url: "https://open-meteo.com/en/docs/elevation-api",
        limitations:
          "90 m DEM smoothes micro-terraces, embankments, and narrow ditches; verify borehole collars and pump pads with differential GPS or site leveling.",
      },
    };
  });
}
