# TerraPulse — Agri Intelligence Platform (Mobile-First PWA)

**TerraPulse** is a full-stack, offline-capable Progressive Web Application (PWA) built with Next.js App Router, TypeScript, MapLibre GL JS, Turf.js, Prisma + PostGIS, Dexie.js (IndexedDB), and scientific geospatial/agronomic engines to evaluate agricultural land from GPS coordinates and field boundaries.

---

## Key Capabilities

1. **Interactive Cartography & Geospatial Field Studio (`/map`)**
   - Drop multiple GPS pins (`FIELD_CENTER`, `WELL_CANDIDATE`, `SOLAR_ARRAY`, `PUMP_INTAKE`, `SOIL_SAMPLE`, `CUSTOM`) or use device GPS.
   - Draw field boundaries interactively, drag vertices to reshape polygons, delete boundaries, and automatically calculate geodesic area ($\text{ha}$, $\text{m}^2$) and perimeter ($\text{m}$) with Turf.js.
   - Switch between OpenStreetMap Standard, Esri World Imagery Satellite, and OpenTopoMap Terrain layers plus water source vectors and weather radar overlays.
2. **Real Environmental & Remote Sensing Analysis (`/environmental`)**
   - **Open-Meteo Forecast & ERA5 Archive**: Current weather, 7-day forecast, configurable agronomic weather alerts (frost, heat, high wind, heavy rain, high $ET_o$), 365-day rainfall & $ET_o$ climatology, Growing Degree Days ($GDD$), seasonal deficits, and UNEP Aridity Index.
   - **Copernicus DEM Elevation**: Farm elevation, parcel relief, slope percentage, terrain aspect, and elevation differentials relative to nearby mapped water sources.
   - **FAO WaPOR v3 (GISMGR v2 + Cloud-Optimized GeoTIFF)**: Actual Evapotranspiration & Interception (`L1-AETI-A` / `L2-AETI-A`), Reference ET (`L1-RET-A`), Precipitation (`L1-PCP-A`), Total Biomass (`L1-TBP-A`), and Net Biomass Water Productivity (`L1-NBWP-A`).
3. **Water Proximity, FAO-56 / PI-Advisor & Hydraulic Pump Calculator (`/water`)**
   - Queries OpenStreetMap Overpass mirrors and WWF HydroSHEDS / HydroBASINS FeatureServers for rivers, streams, canals, reservoirs, springs, and mapped wells, calculating straight-line distance from parcel centroid and boundary, compass bearing, and elevation difference.
   - Explicitly enforces non-operational warnings (mapped features never guarantee perennial water flow or legal extraction rights).
   - Implements deterministic **FAO-56 Penman–Monteith** & crop coefficient ($ET_c = K_c \times ET_o$) scheduling across 12 crops + root-zone soil water balance ($TAW$, $RAW$, irrigation interval).
   - Implements deterministic **Hydraulic Pump Power & Energy Calculator** ($P = (\rho g Q H) / \eta$) with Hazen–Williams pipe friction losses, fittings allowance, and emitter pressure head.
4. **Interactive Solar Energy Simulator (`/solar`)**
   - Real **JRC PVGIS v5.3** solar PV simulation based on latitude, longitude, installed $\text{kWp}$, tilt, azimuth, mounting type, and system losses (with optimal angle discovery).
   - Month-by-month comparison against irrigation pump demand, worst-month coverage percentage, and battery vs. elevated water storage tank sizing.
5. **AI Agricultural Assistant (`/assistant`)**
   - Tool-calling architecture supporting **Groq API** (configurable `GROQ_MODEL` via environment variables) plus a built-in deterministic multi-tool orchestrator fallback when `GROQ_API_KEY` is not set.
   - Executes 11 analytical tools (`analyze_location`, `get_weather`, `get_historical_climate`, `get_nearby_water_sources`, `get_elevation`, `get_wapor_data`, `calculate_solar_production`, `calculate_pump_energy`, `calculate_crop_water_requirements`, `compare_solar_and_pump_energy`, `generate_feasibility_report`).
6. **Feasibility Reports & Multi-Page PDF Export (`/reports`)**
   - Generates structured property feasibility reports citing every data source, retrieval date, and uncertainty, with one-click client-side `.pdf` export (`jspdf`), JSON download, and print/share support.
7. **Mobile-First Installable PWA & Offline-First Sync (`/offline`)**
   - Installable web app manifest, custom icons, service worker shell caching, and Dexie.js IndexedDB local storage.
   - Queues offline creates, edits, boundary changes, and deletions in an idempotent operation queue and synchronizes with conflict detection (`clientTimestamp` vs. server `updatedAt`) when connectivity returns.

---

## Local Installation & Development

### Prerequisites
- Node.js `>= 20` (verified on `v22.19.0`)
- npm `>= 10`
- Optional: PostgreSQL `>= 15` with PostGIS extension (e.g. Supabase or Docker PostGIS). When `DATABASE_URL` is blank or unreachable, the server automatically uses the local persistent file-backed repository in `.data/agri-platform-db.json` paired with Turf.js spatial operations.

### Setup Steps
1. Install dependencies:
   ```bash
   npm install
   ```
2. Copy environment configuration:
   ```bash
   cp .env.example .env.local
   ```
   Edit `.env.local` to add your optional `GROQ_API_KEY` or PostgreSQL + PostGIS `DATABASE_URL`.
3. Validate Prisma schema and generate client:
   ```bash
   npx prisma validate
   npx prisma generate
   ```
   *(If connecting to a fresh PostgreSQL + PostGIS database, run `npx prisma migrate deploy` or apply `prisma/migrations/0001_init_postgis/migration.sql`.)*
4. Generate PWA icons (already committed in `public/icons/`):
   ```bash
   npm run icons:generate
   ```
5. Start development server:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000).

---

## Testing Instructions

Run the complete Vitest unit and live external API integration suite:
```bash
npm test
```
Test suites included in `src/__tests__/`:
- `pump-calculator.test.ts` — Verifies $P = (\rho g Q H)/\eta$, Hazen–Williams friction losses, and gravity-assisted head handling.
- `fao56-calculator.test.ts` — Verifies Penman–Monteith $ET_o$, USDA-SCS effective rainfall, $ET_c$, root-zone $TAW$/$RAW$, and crop ranking.
- `solar-irrigation-matcher.test.ts` — Verifies monthly energy balances, peak-month coverage, and storage sizing.
- `offline-sync.test.ts` — Verifies offline operation queueing, idempotent replay deduplication, and server-newer timestamp conflict detection.
- `auth-onboarding.test.ts` — Verifies email registration, duplicate rejection, Google OAuth flow, login/logout, password reset, per-farmer data ownership, 5-stage onboarding persistence/resume, crop area validation, and offline onboarding sync.
- `api-integrations.test.ts` — Live HTTP verification against Open-Meteo, Copernicus DEM, JRC PVGIS v5.3, OpenStreetMap Overpass, HydroSHEDS, and FAO WaPOR v3.

Run production typecheck and Next.js build:
```bash
npm run build
```

---

## Authentication & Google OAuth Setup

TerraPulse provides complete email/password authentication (`/login`, `/register`, `/forgot-password`, `/auth/callback`) with HMAC-SHA256 HTTP-only sessions, strict per-farmer data isolation, and a 5-stage guided farmer onboarding flow (`/onboarding`).

To enable live Google OAuth 2.0 sign-in:
1. Create an OAuth 2.0 Web Client in Google Cloud Console (`APIs & Services -> Credentials`).
2. Add your Authorized Redirect URI:
   - Local development: `http://localhost:3000/api/auth/oauth-callback`
   - Production: `https://<your-domain>/api/auth/oauth-callback`
3. Set `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `NEXT_PUBLIC_APP_URL` in `.env.local` (or your hosting provider's environment settings).
*(When `GOOGLE_CLIENT_ID` is not set in local development, `/api/auth/google` routes to `/auth/callback?provider=google` for testing the OAuth callback handoff locally.)*

---

## Integrations Requiring API Keys vs. Keyless Public APIs

| Integration | Key Required? | Environment Variable | Notes |
|---|---|---|---|
| **Open-Meteo (Forecast, Archive, Elevation)** | No | `OPEN_METEO_BASE_URL`, `OPEN_METEO_ARCHIVE_URL` | Free public REST APIs |
| **European Commission JRC PVGIS v5.3** | No | `PVGIS_API_BASE_URL` | Free public REST API |
| **OpenStreetMap Overpass API** | No | `OVERPASS_API_URLS` | Comma-separated mirror list |
| **WWF HydroSHEDS / HydroBASINS** | No | `HYDROBASINS_API_URL`, `HYDROBASINS_DEMAND_API_URL` | Public ArcGIS FeatureServers |
| **FAO WaPOR v3 (GISMGR v2)** | No | `WAPOR_API_BASE_URL` | v3 catalog & GCS COGs require no token |
| **Groq AI LLM** | Optional (`GROQ_API_KEY`) | `GROQ_API_KEY`, `GROQ_MODEL`, `GROQ_API_BASE_URL` | Falls back to deterministic tool orchestrator if unset |
| **PostgreSQL + PostGIS** | Optional (`DATABASE_URL`) | `DATABASE_URL` | Falls back to `.data/agri-platform-db.json` if unset |

---

## Offline vs. Online Feature Matrix

| Feature | Online | Offline |
|---|---|---|
| View previously saved farms, pins, boundaries | Yes | Yes (IndexedDB via Dexie) |
| View cached weather, climate, solar, water & WaPOR analyses (with retrieval date) | Yes | Yes (marked as Cached Snapshot) |
| Create/edit farms, drop pins, draw/edit/delete boundaries, calculate geodesic area | Yes | Yes (queued in `syncQueue`) |
| Run deterministic Pump Energy, Hazen–Williams, & FAO-56 Irrigation calculators | Yes | Yes |
| View & export cached Feasibility Reports to PDF / JSON | Yes | Yes |
| Fetch fresh Open-Meteo weather, PVGIS simulations, OSM/HydroSHEDS water queries, WaPOR COGs | Yes | Requires connectivity |
| Run live Groq LLM or remote tool-calling queries | Yes | Requires connectivity |
| Automatic conflict-safe synchronization (`POST /api/sync`) | Yes | Queued until connectivity returns |

---

## Known Limitations & Data Coverage Restrictions

1. **Subsurface Groundwater & Water Rights**: Neither OpenStreetMap nor HydroSHEDS observes aquifer depth, static/dynamic water levels, borehole yield, salinity (EC), or legal abstraction permits. Field hydrogeological surveys are mandatory.
2. **FAO WaPOR v3 Spatial Coverage**: Level 1 (`300 m`) datasets cover the globe; Level 2 (`100 m`) high-resolution layers cover **Africa and the Near East only**. Precipitation (`~5 km`) and Reference ET (`~30 km`) are coarse regional grids.
3. **Straight-Line Distance vs. Pipeline Routing**: Straight-line distance to mapped water features is a lower bound and excludes parcel detours, road crossings, and elevation crests.
4. **PVGIS Geographic Scope**: Covers most global land masses except high-latitude polar extremes and open ocean coordinates (where the Open-Meteo solar radiation fallback engages automatically).
5. **Soil Profile Defaults**: Unless laboratory soil core measurements are entered, FAO-56 root-zone water holding capacity uses standard texture-class defaults.

---

## Deployment Instructions (Production)

1. Provision a PostgreSQL database with the **PostGIS** extension enabled (e.g., Supabase, Neon, or Railway PostgreSQL).
2. Apply schema migrations:
   ```bash
   npx prisma migrate deploy
   ```
3. Configure production environment variables on your hosting platform (Vercel, Railway, or Docker):
   - `DATABASE_URL` (PostgreSQL + PostGIS connection string)
   - `GROQ_API_KEY` and `GROQ_MODEL` (e.g., `llama-3.3-70b-versatile`)
   - `AUTH_SECRET` (strong random secret)
4. Build and start:
   ```bash
   npm run build
   npm start
   ```
5. Serve over HTTPS (required for Service Worker installation and browser `navigator.geolocation` GPS access).
