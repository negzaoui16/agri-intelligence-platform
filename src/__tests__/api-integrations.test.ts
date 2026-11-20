import { describe, expect, it } from "vitest";
import { fetchElevationProfile } from "@/lib/services/elevation";
import { fetchHistoricalClimate, fetchWeatherAndForecast } from "@/lib/services/open-meteo";
import { fetchPVGISSolarAnalysis } from "@/lib/services/pvgis";
import { fetchWaPORData } from "@/lib/services/wapor";
import { fetchNearbyWaterSources } from "@/lib/services/water-sources";

const TEST_LAT = 36.605;
const TEST_LON = 2.945;

describe("Live External Scientific Dataset Integrations", () => {
  it("retrieves live Open-Meteo current weather, 7-day forecast, and 365-day ERA5 archive", async () => {
    const [forecast, archive] = await Promise.all([
      fetchWeatherAndForecast(TEST_LAT, TEST_LON),
      fetchHistoricalClimate(TEST_LAT, TEST_LON),
    ]);

    expect(forecast.daily).toHaveLength(7);
    expect(typeof forecast.current.temperatureC).toBe("number");
    expect(forecast.citation.provenance).toBe("OBSERVED");

    expect(archive.monthly).toHaveLength(12);
    expect(archive.seasons).toHaveLength(4);
    expect(archive.annualEt0Mm).toBeGreaterThan(500);
    expect(archive.aridityIndex).toBeGreaterThan(0);
  });

  it("retrieves Copernicus DEM elevation and computes field slope", async () => {
    const elev = await fetchElevationProfile(TEST_LAT, TEST_LON);
    expect(elev.farmElevationM).toBeGreaterThan(0);
    expect(elev.samplePoints.length).toBeGreaterThanOrEqual(5);
    expect(elev.estimatedSlopePct).toBeGreaterThanOrEqual(0);
  });

  it("retrieves real JRC PVGIS v5.3 monthly and annual solar PV estimates", async () => {
    const solar = await fetchPVGISSolarAnalysis({
      latitude: TEST_LAT,
      longitude: TEST_LON,
      capacityKwp: 10,
      tiltDeg: 32,
      azimuthDeg: 0,
      mountingType: "free",
      systemLossPct: 14,
    });

    expect(solar.monthly).toHaveLength(12);
    expect(solar.annualKwh).toBeGreaterThan(10000);
    expect(solar.specificYieldKwhPerKwp).toBeGreaterThan(1000);
    expect(solar.isEstimatedFallback).toBe(false);
  });

  it("queries OpenStreetMap & HydroSHEDS with mandatory non-operational disclaimer", async () => {
    const water = await fetchNearbyWaterSources(TEST_LAT, TEST_LON, 15000);
    expect(water.mandatoryWarning).toContain("does NOT confirm");
    expect(water.hydroBasin?.hybasId).toBeTruthy();
    expect(water.sources.length).toBeGreaterThan(0);
    expect(water.nearestSource).not.toBeNull();
    expect(water.nearestSource?.operationalVerified).toBe(false);
    expect(water.nearestSource?.distanceFromCentroidM).toBeGreaterThanOrEqual(0);
  });

  it("queries FAO WaPOR v3 catalog and returns layers with explicit resolution & provenance", async () => {
    const wapor = await fetchWaPORData(TEST_LAT, TEST_LON);
    expect(wapor.layers.length).toBeGreaterThanOrEqual(5);
    expect(wapor.citation.name).toContain("WaPOR v3");
    expect(wapor.limitations.length).toBeGreaterThan(20);
  });
});
