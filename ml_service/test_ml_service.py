from fastapi.testclient import TestClient
from train_models import ARTIFACTS_DIR, TS_ARTIFACT_PATH, train_and_export
from app import app


def test_training_chronological_and_artifacts():
    report = train_and_export()
    assert report["splitStrategy"] == "chronological_80_20"
    assert report["trainSamples"] > report["testSamples"]
    assert report["models"]["soil_moisture_forecaster"]["metrics"]["r2"] > 0.7
    assert report["models"]["irrigation_water_demand"]["metrics"]["r2"] > 0.7
    assert (ARTIFACTS_DIR / "soil_moisture_forecaster.joblib").exists()
    assert (ARTIFACTS_DIR / "irrigation_water_demand.joblib").exists()
    assert (ARTIFACTS_DIR / "sensor_anomaly_detector.joblib").exists()
    assert TS_ARTIFACT_PATH.exists()


def test_fastapi_endpoints():
    client = TestClient(app)
    res_h = client.get("/health")
    assert res_h.status_code == 200
    assert res_h.json()["status"] == "ok"

    res_sm = client.post("/predict/soil-moisture", json={
        "initial_moisture_pct": 48.0,
        "kc": 0.9,
        "taw_mm_m": 160.0,
        "infiltration_mm_hr": 15.0,
        "forecast_days": [
            {"date": "2026-06-01", "tempMaxC": 31.0, "humidityPct": 45.0, "precipMm": 0.0, "et0Mm": 5.4},
            {"date": "2026-06-02", "tempMaxC": 32.0, "humidityPct": 42.0, "precipMm": 0.0, "et0Mm": 5.8},
        ],
    })
    assert res_sm.status_code == 200
    assert len(res_sm.json()["forecast"]) == 2

    res_wd = client.post("/predict/water-demand", json={
        "soil_moisture_pct": 35.0,
        "temp_max_c": 33.0,
        "humidity_pct": 40.0,
        "rain_mm": 0.0,
        "et0_mm": 6.1,
        "kc": 1.05,
        "taw_mm_m": 160.0,
        "day_of_year": 175,
    })
    assert res_wd.status_code == 200
    assert res_wd.json()["recommendedIrrigationMm"] > 0.0

    # Prioritized KKT optimization should allocate higher share to higher priority_weight plot
    res_opt = client.post("/optimize/water-allocation", json={
        "available_litres": 2000,
        "plots": [
            {"plot_id": "p_high", "crop_code": "tomato", "crop_name": "Tomato", "area_ha": 1.0, "daily_need_litres": 2000, "priority_weight": 3.0, "ky": 1.05},
            {"plot_id": "p_low", "crop_code": "olive", "crop_name": "Olive", "area_ha": 1.0, "daily_need_litres": 2000, "priority_weight": 1.0, "ky": 0.70},
        ],
    })
    assert res_opt.status_code == 200
    allocs = res_opt.json()["allocations"]
    assert allocs[0]["allocatedLitresDay"] > allocs[1]["allocatedLitresDay"]

    # AquaCrop annual vs FAO-33 perennial check
    res_sim_ann = client.post("/simulate/crop-growth", json={
        "crop_code": "tomato",
        "daily_et0_mm": [4.5] * 135,
        "daily_rain_mm": [0.5] * 135,
        "daily_irrigation_mm": [4.2] * 135,
    })
    assert res_sim_ann.status_code == 200
    assert res_sim_ann.json()["model_used"] == "FAO_AQUACROP_P66"
    assert res_sim_ann.json()["estimated_yield_ton_ha"] > 0

    res_sim_per = client.post("/simulate/crop-growth", json={
        "crop_code": "olive",
        "daily_et0_mm": [4.5] * 240,
        "daily_rain_mm": [1.0] * 240,
        "daily_irrigation_mm": [2.2] * 240,
    })
    assert res_sim_per.status_code == 200
    assert res_sim_per.json()["model_used"] == "FAO33_WATER_PRODUCTION"
