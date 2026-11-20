# External Datasets & Scientific API Integrations

All external adapters live in `src/lib/services/` and enforce Zod coordinate validation, request timeouts (`AbortSignal.timeout`), caching, provenance tagging (`OBSERVED` vs. `MODELED`), and explicit data limitations.

## 1. Open-Meteo (Weather, Climate Archive & Elevation)
- **Forecast**: `GET {OPEN_METEO_BASE_URL}/forecast` — retrieves current temperature, humidity, precipitation, wind speed/direction, WMO weather code, and 7-day daily $T_{\min}, T_{\max}, P, ET_o$, wind, and shortwave radiation.
- **Historical Archive**: `GET {OPEN_METEO_ARCHIVE_URL}/archive` — retrieves a 365-day daily ERA5 climate series, aggregated into 12 monthly summaries, 4 seasonal moisture deficits, Growing Degree Days ($GDD_{10}$), and UNEP Aridity Index ($P / ET_o$).
- **Elevation**: `GET {OPEN_METEO_BASE_URL}/elevation` — batch-queries 90 m Copernicus DEM GLO-90 elevations for farm centers, cardinal $\pm 250\text{ m}$ slope sample points, polygon vertices, and all detected water sources.

## 2. European Commission JRC PVGIS v5.3
- **Endpoint**: `GET {PVGIS_API_BASE_URL}/PVcalc`
- **Inputs**: `lat`, `lon`, `peakpower` ($\text{kWp}$), `loss` ($\%$), `angle` (tilt), `aspect` (azimuth), `mountingplace`, `optimalangles`, `outputformat=json`.
- **Outputs**: Daily/monthly/annual PV yield ($\text{kWh}$), in-plane irradiation $H(i)_m$, inter-annual standard deviation $SD_m$, and loss breakdowns (`l_aoi`, `l_spec`, `l_tg`, `l_total`).
- **Fallback**: For coordinates outside PVGIS land coverage, falls back to Open-Meteo horizontal shortwave irradiance with explicit provenance disclosure.

## 3. OpenStreetMap Overpass & WWF HydroSHEDS / HydroBASINS
- **OSM Overpass**: Queries bounding-box water features (`waterway=river|stream|canal`, `natural=water`, `man_made=water_well|water_tower`, `natural=spring`) across configurable mirror endpoints (`OVERPASS_API_URLS`), avoiding slow regex filters.
- **HydroSHEDS / HydroBASINS**: Queries global HydroBASINS FeatureServers for catchment `HYBAS_ID`, `PFAF_ID`, `UP_AREA`, `SUB_AREA`, sub-basin irrigation water gap, and major river polylines.
- **Safety Invariant**: Every returned feature is permanently flagged `operationalVerified: false` with a mandatory warning explaining that mapped features do not confirm flow, water quality, or abstraction rights.

## 4. FAO WaPOR v3 (GISMGR v2 + Cloud-Optimized GeoTIFFs)
- **Catalog**: `GET {WAPOR_API_BASE_URL}/mapsets/{code}/rasters`
- **Mapsets**: `L1-AETI-A` (300 m), `L1-RET-A` (~30 km), `L1-PCP-A` (~5 km), `L1-TBP-A` (300 m), `L1-NBWP-A` (300 m), and `L2-AETI-A` (100 m Africa & Near East).
- **Pixel Sampling**: Uses `geotiff` (`fromUrl`) with HTTP `Range` requests to read the single target pixel `[px, py, px+1, py+1]` using the raster's `affineTransform`, applying `scale` and `offset`, and filtering `noDataValue: -9999`.
