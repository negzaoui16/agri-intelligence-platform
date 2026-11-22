"""
FarmBrain Python ML & Scientific Simulation Service (FastAPI)
Runs alongside Next.js; exposes trained RandomForest, GradientBoosting,
IsolationForest, KKT Constrained Optimizer, and FAO Paper 66 AquaCrop endpoints.
"""

from __future__ import annotations

import json
import os
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Optional

import joblib
import numpy as np
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

from aquacrop_engine import SoilParams, simulate_crop_season

ARTIFACTS_DIR = Path(__file__).resolve().parent / "artifacts"

app = FastAPI(title="FarmBrain ML & AquaCrop Engine", version="1.0.0")


class PredictSoilMoistureRequest(BaseModel):
    initial_moisture_pct: float = Field(ge=0.0, le=100.0)
    kc: float = Field(ge=0.2, le=1.5, default=0.85)
    taw_mm_m: float = Field(ge=60.0, le=300.0, default=160.0)
    infiltration_mm_hr: float = Field(ge=1.0, le=80.0, default=16.0)
    forecast_days: List[dict]


class PredictWaterDemandRequest(BaseModel):
    soil_moisture_pct: float = Field(ge=0.0, le=100.0)
    temp_max_c: float
    humidity_pct: float = Field(ge=0.0, le=100.0)
    rain_mm: float = Field(ge=0.0, default=0.0)
    et0_mm: float = Field(ge=0.0)
    kc: float = Field(ge=0.2, le=1.5, default=0.85)
    taw_mm_m: float = Field(ge=60.0, le=300.0, default=160.0)
    day_of_year: int = Field(ge=1, le=366, default=150)


class AnomalyCheckRequest(BaseModel):
    soil_moisture_pct: float
    temp_max_c: float
    humidity_pct: float
    et0_mm: float = 4.0


class OptimizeAllocationPlot(BaseModel):
    plot_id: str
    crop_code: str
    crop_name: str
    area_ha: float = Field(gt=0.0)
    daily_need_litres: float = Field(ge=0.0)
    priority_weight: float = Field(gt=0.0)
    ky: float = Field(gt=0.1, default=1.0)


class OptimizeAllocationRequest(BaseModel):
    available_litres: float = Field(ge=0.0)
    plots: List[OptimizeAllocationPlot]


class SimulateCropGrowthRequest(BaseModel):
    crop_code: str
    daily_et0_mm: List[float]
    daily_rain_mm: List[float]
    daily_irrigation_mm: Optional[List[float]] = None
    fc_mm_m: float = 290.0
    wp_mm_m: float = 140.0
    infiltration_mm_hr: float = 18.0


def _load_artifacts() -> Dict[str, object]:
    metrics_file = ARTIFACTS_DIR / "model_metrics.json"
    if not metrics_file.exists():
        from train_models import train_and_export
        train_and_export()

    return {
        "metrics": json.loads(metrics_file.read_text(encoding="utf-8")),
        "rf": joblib.load(ARTIFACTS_DIR / "soil_moisture_forecaster.joblib"),
        "gbr": joblib.load(ARTIFACTS_DIR / "irrigation_water_demand.joblib"),
        "iforest": joblib.load(ARTIFACTS_DIR / "sensor_anomaly_detector.joblib"),
    }


_CACHE: Optional[Dict[str, object]] = None


def get_models() -> Dict[str, object]:
    global _CACHE
    if _CACHE is None:
        _CACHE = _load_artifacts()
    return _CACHE


@app.get("/health")
def health() -> dict:
    models = get_models()
    return {
        "status": "ok",
        "modelsLoaded": ["soil_moisture_forecaster", "irrigation_water_demand", "sensor_anomaly_detector"],
        "metrics": models["metrics"],
    }


@app.post("/predict/soil-moisture")
def predict_soil_moisture(req: PredictSoilMoistureRequest) -> dict:
    models = get_models()
    rf = models["rf"]
    gbr = models["gbr"]
    p80 = float(models["metrics"]["models"]["soil_moisture_forecaster"]["residualP80Pct"])

    moisture = req.initial_moisture_pct
    out = []
    for idx, day in enumerate(req.forecast_days[:7]):
        temp_max = float(day.get("tempMaxC", 26.0))
        humidity = float(day.get("humidityPct", 58.0))
        rain = float(day.get("precipMm", 0.0))
        et0 = float(day.get("et0Mm") or max(0.8, 0.19 * max(0.0, temp_max - 8.0) * (1.0 - 0.35 * (humidity / 100.0))))
        date_str = str(day.get("date") or (datetime.utcnow() + timedelta(days=idx)).strftime("%Y-%m-%d"))
        doy = datetime.strptime(date_str[:10], "%Y-%m-%d").timetuple().tm_yday
        doy_sin = float(np.sin(2.0 * np.pi * doy / 365.25))
        doy_cos = float(np.cos(2.0 * np.pi * doy / 365.25))

        x_b = np.array([[moisture, temp_max, humidity, rain, et0, req.kc, req.taw_mm_m, doy_sin, doy_cos]])
        rec_irr = float(np.clip(gbr.predict(x_b)[0], 0.0, 20.0))

        x_a = np.array([[moisture, temp_max, humidity, rain, et0, rec_irr, req.kc, req.taw_mm_m, req.infiltration_mm_hr, doy_sin, doy_cos]])
        next_m = float(np.clip(rf.predict(x_a)[0], 5.0, 98.0))

        band = p80 * (1.0 + 0.12 * idx)
        out.append({
            "dayIndex": idx,
            "date": date_str[:10],
            "expectedMoisturePct": round(next_m, 1),
            "lowerBandPct": round(max(5.0, next_m - band), 1),
            "upperBandPct": round(min(98.0, next_m + band), 1),
            "rainMm": round(rain, 1),
            "et0Mm": round(et0, 1),
            "recommendedIrrigationMm": round(rec_irr, 1),
            "method": "ML_RANDOM_FOREST",
        })
        moisture = next_m

    return {"forecast": out, "modelMetrics": models["metrics"]["models"]["soil_moisture_forecaster"]["metrics"]}


@app.post("/predict/water-demand")
def predict_water_demand(req: PredictWaterDemandRequest) -> dict:
    models = get_models()
    gbr = models["gbr"]
    doy_sin = float(np.sin(2.0 * np.pi * req.day_of_year / 365.25))
    doy_cos = float(np.cos(2.0 * np.pi * req.day_of_year / 365.25))
    x = np.array([[req.soil_moisture_pct, req.temp_max_c, req.humidity_pct, req.rain_mm, req.et0_mm, req.kc, req.taw_mm_m, doy_sin, doy_cos]])
    pred_mm = float(np.clip(gbr.predict(x)[0], 0.0, 25.0))
    return {
        "recommendedIrrigationMm": round(pred_mm, 2),
        "modelMetrics": models["metrics"]["models"]["irrigation_water_demand"]["metrics"],
    }


@app.post("/predict/anomaly")
def detect_anomaly(req: AnomalyCheckRequest) -> dict:
    models = get_models()
    iforest = models["iforest"]
    x = np.array([[req.soil_moisture_pct, req.temp_max_c, req.humidity_pct, req.et0_mm]])
    score = float(iforest.decision_function(x)[0])
    is_outlier = bool(iforest.predict(x)[0] == -1)
    physical_fault = (
        req.soil_moisture_pct <= 2.0
        or req.soil_moisture_pct >= 97.5
        or req.temp_max_c > 52.0
        or req.temp_max_c < -5.0
    )
    return {
        "anomalyDetected": bool(is_outlier or physical_fault),
        "isolationScore": round(score, 4),
        "physicalBoundsTriggered": physical_fault,
    }


@app.post("/optimize/water-allocation")
def optimize_water_allocation(req: OptimizeAllocationRequest) -> dict:
    if not req.plots:
        raise HTTPException(status_code=400, detail="At least one plot is required")

    total_requested = sum(p.daily_need_litres for p in req.plots)
    avail = req.available_litres

    if avail >= total_requested:
        allocations = [
            {
                "plotId": p.plot_id,
                "allocatedLitresDay": round(p.daily_need_litres, 1),
                "fulfillmentPct": 100.0,
                "estimatedYieldImpactPct": 0.0,
            }
            for p in req.plots
        ]
        return {"allocations": allocations, "weightedYieldPreservedPct": 100.0}

    # Maximize sum_i w_i * log(a_i + 1) subject to 0 <= a_i <= d_i and sum a_i <= avail
    # via binary search on water shadow price lambda (exact KKT water-filling)
    lo, hi = 0.0, max(p.priority_weight for p in req.plots) + 1e-6
    for _ in range(60):
        mid = 0.5 * (lo + hi)
        s = sum(min(p.daily_need_litres, max(0.0, (p.priority_weight / max(mid, 1e-9)) - 1.0)) for p in req.plots)
        if s > avail:
            lo = mid
        else:
            hi = mid

    lam = 0.5 * (lo + hi)
    allocations = []
    for p in req.plots:
        alloc = min(p.daily_need_litres, max(0.0, (p.priority_weight / max(lam, 1e-9)) - 1.0))
        fulfillment = 100.0 if p.daily_need_litres <= 0 else (alloc / p.daily_need_litres) * 100.0
        yield_drop = -p.ky * max(0.0, 1.0 - fulfillment / 100.0) * 100.0
        allocations.append({
            "plotId": p.plot_id,
            "allocatedLitresDay": round(alloc, 1),
            "fulfillmentPct": round(fulfillment, 1),
            "estimatedYieldImpactPct": round(max(-85.0, yield_drop), 1),
        })

    return {"allocations": allocations}


@app.post("/simulate/crop-growth")
def simulate_crop_growth(req: SimulateCropGrowthRequest) -> dict:
    return simulate_crop_season(
        crop_code=req.crop_code,
        daily_et0_mm=req.daily_et0_mm,
        daily_rain_mm=req.daily_rain_mm,
        daily_irrigation_mm=req.daily_irrigation_mm,
        soil=SoilParams(
            fc_mm_m=req.fc_mm_m,
            wp_mm_m=req.wp_mm_m,
            infiltration_mm_hr=req.infiltration_mm_hr,
        ),
    )


if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("FARMBRAIN_ML_PORT", "8001"))
    uvicorn.run("app:app", host="127.0.0.1", port=port, reload=False)
