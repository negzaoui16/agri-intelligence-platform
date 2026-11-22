# FarmBrain — Technical Architecture & Scientific Models

## 1. Overview
FarmBrain adds an AI & agronomic decision-support layer on top of TerraPulse without altering existing ESP32 firmware (`hardware/terrapulse_node/`) or IoT telemetry endpoints (`/api/devices/readings`, `/api/farms/[id]/devices`, `GET/POST /api/farms/[id]/sensors`). FarmBrain reads sensor telemetry strictly read-only via `getFarmSensorsBundle`.

## 2. Database & Dual-Store Persistence (`0005_farmbrain_and_simulator`)
Added four Prisma models in `prisma/schema.prisma` and `prisma/migrations/0005_farmbrain_and_simulator/migration.sql`:
- `FarmBrainAnalysis`: Versioned snapshots storing `dataCompletenessPct`, provenance items, baseline vs. smart savings breakdown, 3-tier verification state, 7-day forecast, per-plot breakdown, 3-part recommendations, anomaly flags, ML model metadata, assumptions, and limitations.
- `SimulationScenario`: Isolated what-if scenarios (`WATER_SHORTAGE`, `CHANGE_CROP`, `WEATHER_CLIMATE`, `IRRIGATION_STRATEGY`, `FARM_EXPANSION`), inputs JSON, computed results JSON, and `isArchived`.
- `MLModelMetadata`: Evaluation metrics (`mae`, `rmse`, `r2`, train/test counts, feature names).
- `MLPredictionLog`: Per-farm audit log recording inference summaries and provenance.

Every query passes through `src/lib/db/repository.ts` backed by `src/lib/db/pg-store.ts` and `src/lib/db/local-store.ts`. When Postgres returns `P2021`/`P2022` (prior to applying migration `0005` remotely), reads and writes fall back safely to the persistent local store.

## 3. Machine Learning Pipeline (`ml_service/`)
Trained via `ml_service/train_models.py` across 5 Tunisian agro-climatic zones (Cap Bon, Kairouan, Sfax, Beja, Gabes) and 4 soil classes using chronological daily FAO-56 water-balance series from `2021-01-01` to `2025-12-31`:
- **Chronological Split**: Strict temporal cutoff at `2024-12-31` (`7,300` training samples strictly earlier than `1,830` unseen test samples; zero random shuffling across time).
- **Model A (`soil_moisture_forecaster`)**: `RandomForestRegressor` (`n_estimators=24, max_depth=8`). Test metrics on unseen holdout: `MAE = 1.0898%`, `RMSE = 1.5476%`, `R² = 0.991`, `80th-percentile residual = 1.638%`.
- **Model B (`irrigation_water_demand`)**: `GradientBoostingRegressor` (`n_estimators=45, max_depth=4`). Test metrics on unseen holdout: `MAE = 0.2187 mm/day`, `RMSE = 0.3155 mm/day`, `R² = 0.9936`.
- **Model C (`sensor_anomaly_detector`)**: `IsolationForest` (`n_estimators=100, contamination=0.03`) paired with physical operating bounds (`2%..97.5%` moisture, `-5°C..52°C` temperature) and ESP32 `soilFault` flags: `Precision = 0.7792`, `Recall = 1.0`, `F1 = 0.8759`.
- **Artifact Parity**: Trained `.joblib` pipelines serve the FastAPI microservice (`ml_service/app.py`), while exact serialized decision trees are exported to `src/lib/engines/ml-model-artifacts.json` so Next.js API routes and offline-tolerant TypeScript execution evaluate the exact same trees even when the Python server is stopped.

## 4. Scientific Models & Engineering Rules
- **Annual vs. Perennial Crop Yield Simulation**:
  - Annual crops (`tomato`, `wheat`, `barley`, `maize`, `potato`, `sorghum`, `soybean`, `cotton`, `rice`) run through FAO Paper 66 AquaCrop equations (`FAO_AQUACROP_P66`) tracking root depth expansion, canopy cover expansion/senescence, transpiration stress (`Ks_sto`), normalized water productivity (`WP*`), biomass, and harvest index.
  - Perennial orchards (`olive`, `citrus`, `date_palm`, `grapes`, `almond`) run through FAO-56 + FAO-33 water-yield production function (`FAO33_WATER_PRODUCTION`, $1 - Y_a/Y_m = K_y(1 - ET_a/ET_m)$) because AquaCrop targets herbaceous crops.
  - Note: PyPI `aquacrop` was omitted to maintain clean Python 3.12 Windows compatibility; the canonical FAO Paper 66 differential/daily equations are implemented directly in `ml_service/aquacrop_engine.py` and mirrored in `src/lib/engines/farmbrain-engine.ts`.
- **Constrained Water Allocation Optimizer (`allocateWaterKKT`)**: Uses water-filling across plots weighted by FAO $K_y$, growth-stage criticality (`1.35x` mid/flowering), and drought intolerance — strictly satisfying $\sum a_i \le A_{\text{available}}$ and $0 \le a_i \le d_i$.
- **Solar-Free Electricity Rule**: When solar covers pump electricity (`solarStatus === "YES"` and coverage $\ge 95\%$ or off-grid), grid electricity cost and electricity TND savings are fixed at `0 TND`; kWh and pump run-hours savings are still reported accurately.
- **3-Tier Verified Savings**: Distinguishes `INITIAL_PROJECTION`, `SENSOR_UPDATED_PROJECTION`, and `VERIFIED_ACTUAL` (integrated from 24h ESP32 `pumpOn` cycles).

## 5. API Endpoints & Rewrites
Next.js App Router exposes handlers under `/api/*`, plus `next.config.mjs` rewrites exposing:
- `/farmbrain/overview`, `/farmbrain/analyze`, `/farmbrain/savings`, `/farmbrain/history`, `/farmbrain/recalculate`
- `/simulator/scenarios`, `/simulator/scenarios/[id]`, `/simulator/scenarios/[id]/run`, `/simulator/compare`
- `/predict/soil-moisture`, `/predict/water-demand`, `/optimize/water-allocation`, `/simulate/crop-growth`
