# System Architecture — TerraPulse Agri Intelligence Platform

## 1. Layered Modular Design (NestJS-Extraction Ready)

The backend logic is strictly decoupled from Next.js routing inside `src/lib/` so every engine and external integration service can be extracted directly into standalone NestJS `@Injectable()` services without rewriting business logic:

```text
src/
├── app/
│   ├── api/                 # Thin HTTP transport controllers (Zod + rate limit + auth)
│   └── (pages)/             # Mobile-first App Router UI views
├── components/
│   ├── layout/              # Responsive AppShell (Desktop rail + Mobile bottom nav)
│   ├── map/                 # MapLibre GL JS + Turf.js interactive field editor
│   └── ui/                  # Design system primitives & DataFreshnessBadge
├── hooks/                   # TanStack Query + Dexie offline-first hooks
└── lib/
    ├── ai/                  # 11 analytical tools + Groq / deterministic router
    ├── auth/                # HMAC-SHA256 signed session cookie helper
    ├── cache/               # TTL in-memory cache
    ├── db/                  # Prisma + PostGIS + automatic local JSON fallback
    ├── engines/             # Pure deterministic scientific modules (zero I/O)
    │   ├── fao56-calculator.ts
    │   ├── pump-calculator.ts
    │   └── solar-irrigation-matcher.ts
    ├── offline/             # Dexie IndexedDB schema & conflict-safe sync queue
    ├── security/            # Token-bucket rate limiter
    ├── services/            # External API adapters (Open-Meteo, PVGIS, Overpass, HydroSHEDS, WaPOR)
    ├── store/               # Zustand UI/connectivity state
    └── validation/          # Shared Zod schemas
```

## 2. Dual-Mode Spatial Persistence (PostGIS + Local Fallback)

- **Prisma Schema (`prisma/schema.prisma`)**: Defines 17 relational models (`User`, `Farm`, `FarmBoundary`, `FarmLocation`, `Crop`, `SoilProfile`, `WaterSource`, `WeatherObservation`, `SolarConfiguration`, `SolarAnalysis`, `PumpConfiguration`, `IrrigationAnalysis`, `EnvironmentalAnalysis`, `FeasibilityReport`, `AIConversation`, `AIMessage`, `SyncOperation`) with PostGIS `geometry(Polygon, 4326)` and `geometry(Point, 4326)` columns indexed via `GIST`.
- **SQL Migration (`prisma/migrations/0001_init_postgis/migration.sql`)**: Enables `CREATE EXTENSION IF NOT EXISTS postgis;` and creates all tables, spatial columns, and `GIST` indexes.
- **Turf.js + Local File Store**: When `DATABASE_URL` is unconfigured or offline during local evaluation, `repository.ts` executes spatial calculations (geodesic polygon area, perimeter, centroids, point-in-polygon, distance-to-boundary) via `@turf/turf` and persists normalized entities to `.data/agri-platform-db.json`.

## 3. PI-Advisor Investigation & FAO-56 Integration

- Investigated `https://github.com/wateraccounting/PI-Advisor`.
- PI-Advisor is implemented as a Python/Streamlit + Google Earth Engine application rather than a public REST API.
- Rather than fabricating an external API dependency, TerraPulse adapts PI-Advisor's core agronomic computations into a verified deterministic TypeScript module (`src/lib/engines/fao56-calculator.ts`) implementing full FAO-56 Penman–Monteith $ET_o$, dual/stage crop coefficients ($K_{c,\text{ini}}, K_{c,\text{mid}}, K_{c,\text{end}}$), USDA-SCS effective rainfall, and root-zone soil water balance ($TAW, RAW$, and irrigation interval).

## 4. Offline-First Sync Protocol

1. Every client mutation writes immediately to Dexie IndexedDB (`farms`, `reports`) and appends a `SyncQueueItem` containing a UUID `operationId`, `entityType`, `entityId`, `action`, `payload`, and `clientTimestamp`.
2. When online, `flushSyncQueue()` posts batched operations to `POST /api/sync`.
3. Server idempotency checks `operationId` in `SyncOperation` to ignore duplicate retries safely.
4. Timestamp conflict detection compares `clientTimestamp` against existing server `updatedAt`. If the server record is newer, the server returns `status: "CONFLICT"` with `serverRecord` without silently overwriting data, allowing the user to choose "Keep Server Version" or "Push My Offline Edit".
