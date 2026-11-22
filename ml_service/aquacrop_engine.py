"""
FAO Paper 66 AquaCrop Daily Canopy / Biomass / Yield Engine (for Annual Crops)
and FAO-56 + FAO-33 Yield-Water Production Engine (for Perennial Orchards).
"""

from __future__ import annotations

import math
from dataclasses import dataclass
from typing import Dict, List, Literal, Optional


ANNUAL_AQUACROP_SPECS: Dict[str, dict] = {
    "tomato": {
        "name": "Tomato",
        "cycle_days": 135,
        "cc0_pct": 1.2,
        "ccx_pct": 85.0,
        "cgc_per_day": 0.105,
        "cdc_per_day": 0.085,
        "kc_tr_x": 1.15,
        "root_min_m": 0.25,
        "root_max_m": 0.90,
        "p_base": 0.40,
        "wp_star_g_m2": 18.0,
        "hi0_pct": 60.0,
        "dry_matter_frac": 0.075,  # fresh fruit ~7.5% DM
        "ky": 1.05,
    },
    "wheat": {
        "name": "Wheat",
        "cycle_days": 155,
        "cc0_pct": 1.8,
        "ccx_pct": 88.0,
        "cgc_per_day": 0.085,
        "cdc_per_day": 0.075,
        "kc_tr_x": 1.15,
        "root_min_m": 0.25,
        "root_max_m": 1.20,
        "p_base": 0.55,
        "wp_star_g_m2": 15.0,
        "hi0_pct": 45.0,
        "dry_matter_frac": 0.87,
        "ky": 1.05,
    },
    "barley": {
        "name": "Barley",
        "cycle_days": 140,
        "cc0_pct": 1.8,
        "ccx_pct": 85.0,
        "cgc_per_day": 0.090,
        "cdc_per_day": 0.080,
        "kc_tr_x": 1.10,
        "root_min_m": 0.25,
        "root_max_m": 1.10,
        "p_base": 0.60,
        "wp_star_g_m2": 15.0,
        "hi0_pct": 44.0,
        "dry_matter_frac": 0.88,
        "ky": 1.00,
    },
    "maize": {
        "name": "Maize",
        "cycle_days": 130,
        "cc0_pct": 1.0,
        "ccx_pct": 92.0,
        "cgc_per_day": 0.115,
        "cdc_per_day": 0.085,
        "kc_tr_x": 1.20,
        "root_min_m": 0.25,
        "root_max_m": 1.25,
        "p_base": 0.55,
        "wp_star_g_m2": 32.0,  # C4 crop
        "hi0_pct": 48.0,
        "dry_matter_frac": 0.86,
        "ky": 1.25,
    },
    "potato": {
        "name": "Potato",
        "cycle_days": 120,
        "cc0_pct": 1.5,
        "ccx_pct": 86.0,
        "cgc_per_day": 0.110,
        "cdc_per_day": 0.090,
        "kc_tr_x": 1.15,
        "root_min_m": 0.20,
        "root_max_m": 0.60,
        "p_base": 0.35,
        "wp_star_g_m2": 18.0,
        "hi0_pct": 70.0,
        "dry_matter_frac": 0.22,
        "ky": 1.10,
    },
    "sorghum": {
        "name": "Sorghum",
        "cycle_days": 125,
        "cc0_pct": 1.2,
        "ccx_pct": 85.0,
        "cgc_per_day": 0.105,
        "cdc_per_day": 0.080,
        "kc_tr_x": 1.10,
        "root_min_m": 0.25,
        "root_max_m": 1.30,
        "p_base": 0.55,
        "wp_star_g_m2": 30.0,
        "hi0_pct": 45.0,
        "dry_matter_frac": 0.88,
        "ky": 0.90,
    },
    "soybean": {
        "name": "Soybean",
        "cycle_days": 125,
        "cc0_pct": 1.2,
        "ccx_pct": 85.0,
        "cgc_per_day": 0.095,
        "cdc_per_day": 0.080,
        "kc_tr_x": 1.15,
        "root_min_m": 0.25,
        "root_max_m": 1.00,
        "p_base": 0.50,
        "wp_star_g_m2": 15.0,
        "hi0_pct": 40.0,
        "dry_matter_frac": 0.89,
        "ky": 0.85,
    },
    "cotton": {
        "name": "Cotton",
        "cycle_days": 165,
        "cc0_pct": 1.0,
        "ccx_pct": 88.0,
        "cgc_per_day": 0.085,
        "cdc_per_day": 0.070,
        "kc_tr_x": 1.18,
        "root_min_m": 0.25,
        "root_max_m": 1.40,
        "p_base": 0.60,
        "wp_star_g_m2": 15.0,
        "hi0_pct": 35.0,
        "dry_matter_frac": 0.92,
        "ky": 0.85,
    },
    "rice": {
        "name": "Rice",
        "cycle_days": 135,
        "cc0_pct": 1.5,
        "ccx_pct": 90.0,
        "cgc_per_day": 0.105,
        "cdc_per_day": 0.085,
        "kc_tr_x": 1.20,
        "root_min_m": 0.20,
        "root_max_m": 0.50,
        "p_base": 0.25,
        "wp_star_g_m2": 19.0,
        "hi0_pct": 50.0,
        "dry_matter_frac": 0.86,
        "ky": 1.20,
    },
}

PERENNIAL_FAO33_SPECS: Dict[str, dict] = {
    "olive": {
        "name": "Olive",
        "cycle_days": 240,
        "kc_mid": 0.70,
        "root_max_m": 1.50,
        "p_base": 0.65,
        "ym_ton_ha": 8.5,
        "ky": 0.70,
    },
    "citrus": {
        "name": "Citrus",
        "cycle_days": 270,
        "kc_mid": 0.75,
        "root_max_m": 1.25,
        "p_base": 0.50,
        "ym_ton_ha": 28.0,
        "ky": 1.10,
    },
    "date_palm": {
        "name": "Date Palm",
        "cycle_days": 300,
        "kc_mid": 0.95,
        "root_max_m": 2.00,
        "p_base": 0.65,
        "ym_ton_ha": 10.5,
        "ky": 0.80,
    },
    "grapes": {
        "name": "Grapes",
        "cycle_days": 180,
        "kc_mid": 0.85,
        "root_max_m": 1.50,
        "p_base": 0.45,
        "ym_ton_ha": 18.0,
        "ky": 0.85,
    },
    "almond": {
        "name": "Almond",
        "cycle_days": 210,
        "kc_mid": 0.90,
        "root_max_m": 1.60,
        "p_base": 0.50,
        "ym_ton_ha": 3.5,
        "ky": 0.85,
    },
}


@dataclass
class SoilParams:
    fc_mm_m: float = 290.0
    wp_mm_m: float = 140.0
    infiltration_mm_hr: float = 18.0


def simulate_crop_season(
    crop_code: str,
    daily_et0_mm: List[float],
    daily_rain_mm: List[float],
    daily_irrigation_mm: Optional[List[float]] = None,
    soil: SoilParams = SoilParams(),
) -> dict:
    """
    Runs a full seasonal crop growth and water-productivity simulation.
    Returns explicit model name (`FAO_AQUACROP_P66` or `FAO33_WATER_PRODUCTION`)
    plus daily canopy cover, soil water depletion, biomass, and estimated yield.
    """
    code = crop_code.lower().strip()
    taw_mm_m = max(60.0, soil.fc_mm_m - soil.wp_mm_m)

    if code in ANNUAL_AQUACROP_SPECS:
        spec = ANNUAL_AQUACROP_SPECS[code]
        days = min(len(daily_et0_mm), spec["cycle_days"])
        irr = daily_irrigation_mm or [0.0] * days

        root_d = spec["root_min_m"]
        taw = taw_mm_m * root_d
        depletion = taw * 0.25
        cc = spec["cc0_pct"] / 100.0
        ccx = spec["ccx_pct"] / 100.0
        biomass_g_m2 = 0.0
        total_et_a = 0.0
        total_et_m = 0.0
        total_irr = 0.0
        total_rain_eff = 0.0
        daily_series = []

        for d in range(days):
            et0 = max(0.3, float(daily_et0_mm[d]))
            rain = max(0.0, float(daily_rain_mm[d]))
            applied = max(0.0, float(irr[d])) if d < len(irr) else 0.0
            total_irr += applied

            # Root expansion to mid-season
            frac = min(1.0, (d + 1) / max(1.0, 0.55 * spec["cycle_days"]))
            root_d = spec["root_min_m"] + (spec["root_max_m"] - spec["root_min_m"]) * frac
            taw = taw_mm_m * root_d
            raw = taw * spec["p_base"]

            # Effective rainfall (SCS simplified)
            eff_rain = rain * 0.85 if rain <= 35 else 35 * 0.85 + (rain - 35) * 0.55
            total_rain_eff += eff_rain

            # Add infiltration & irrigation to root zone
            depletion = max(0.0, depletion - eff_rain - applied)

            # Canopy development or senescence
            ks_exp = 1.0 if depletion <= raw * 0.85 else max(0.15, 1.0 - (depletion - raw * 0.85) / max(10.0, taw - raw * 0.85))
            senescence_start = int(spec["cycle_days"] * 0.72)
            if d < senescence_start:
                cgc_eff = spec["cgc_per_day"] * ks_exp
                if cc < ccx / 2.0:
                    cc = min(ccx, cc * math.exp(cgc_eff))
                else:
                    cc = min(ccx, ccx - (ccx - cc) * math.exp(-cgc_eff))
            else:
                cc = max(0.02, cc * math.exp(-spec["cdc_per_day"] * (1.2 - 0.2 * ks_exp)))

            # Transpiration & soil evaporation (FAO Paper 66 eq)
            ks_sto = 1.0 if depletion <= raw else max(0.05, (taw - depletion) / max(1.0, taw - raw))
            kc_tr = spec["kc_tr_x"] * min(1.0, cc * 1.15)
            tr_pot = kc_tr * et0
            tr_act = tr_pot * ks_sto
            ke = (1.0 - cc) * (0.9 if (eff_rain + applied) > 3.0 else 0.25)
            evap = ke * et0
            et_m_day = tr_pot + evap
            et_a_day = tr_act + evap

            total_et_m += et_m_day
            total_et_a += et_a_day

            depletion = min(taw, depletion + et_a_day)
            # Biomass gain g/m2 via normalized water productivity WP*
            biomass_g_m2 += spec["wp_star_g_m2"] * (tr_act / et0)
            moisture_pct = max(0.0, min(100.0, 100.0 * (1.0 - depletion / max(1.0, taw))))

            if d % 5 == 0 or d == days - 1:
                daily_series.append({
                    "day": d + 1,
                    "canopy_cover_pct": round(cc * 100.0, 1),
                    "soil_moisture_pct": round(moisture_pct, 1),
                    "biomass_ton_ha": round(biomass_g_m2 / 100.0, 2),
                })

        # Harvest Index adjustment if severe seasonal water deficit
        et_ratio = total_et_a / max(1.0, total_et_m)
        hi_adj = (spec["hi0_pct"] / 100.0) * max(0.55, min(1.05, 0.4 + 0.6 * et_ratio))
        dry_yield_ton_ha = (biomass_g_m2 / 100.0) * hi_adj
        fresh_yield_ton_ha = dry_yield_ton_ha / spec["dry_matter_frac"]

        return {
            "model_used": "FAO_AQUACROP_P66",
            "crop_code": code,
            "crop_name": spec["name"],
            "cycle_days": days,
            "total_et_m_mm": round(total_et_m, 1),
            "total_et_a_mm": round(total_et_a, 1),
            "total_effective_rain_mm": round(total_rain_eff, 1),
            "total_irrigation_mm": round(total_irr, 1),
            "biomass_ton_ha": round(biomass_g_m2 / 100.0, 2),
            "estimated_yield_ton_ha": round(fresh_yield_ton_ha, 2),
            "relative_yield_pct": round(min(100.0, max(15.0, 100.0 * (1.0 - spec["ky"] * max(0.0, 1.0 - et_ratio)))), 1),
            "daily_series": daily_series,
        }

    # Perennial orchard / unsupported annual fallback -> FAO-56 + FAO-33 Yield-Water function
    per_spec = PERENNIAL_FAO33_SPECS.get(
        code,
        {
            "name": code.replace("_", " ").title(),
            "cycle_days": 150,
            "kc_mid": 0.90,
            "root_max_m": 1.00,
            "p_base": 0.50,
            "ym_ton_ha": 15.0,
            "ky": 1.00,
        },
    )
    days = min(len(daily_et0_mm), per_spec["cycle_days"])
    irr = daily_irrigation_mm or [0.0] * days
    taw = taw_mm_m * per_spec["root_max_m"]
    raw = taw * per_spec["p_base"]
    depletion = taw * 0.25
    total_et_m = 0.0
    total_et_a = 0.0
    total_rain_eff = 0.0
    total_irr = 0.0
    daily_series = []

    for d in range(days):
        et0 = max(0.3, float(daily_et0_mm[d]))
        rain = max(0.0, float(daily_rain_mm[d]))
        applied = max(0.0, float(irr[d])) if d < len(irr) else 0.0
        total_irr += applied
        eff_rain = rain * 0.85
        total_rain_eff += eff_rain
        depletion = max(0.0, depletion - eff_rain - applied)
        ks = 1.0 if depletion <= raw else max(0.05, (taw - depletion) / max(1.0, taw - raw))
        et_m_day = per_spec["kc_mid"] * et0
        et_a_day = et_m_day * ks
        total_et_m += et_m_day
        total_et_a += et_a_day
        depletion = min(taw, depletion + et_a_day)
        moisture_pct = max(0.0, min(100.0, 100.0 * (1.0 - depletion / max(1.0, taw))))
        if d % 7 == 0 or d == days - 1:
            daily_series.append({
                "day": d + 1,
                "canopy_cover_pct": 70.0,
                "soil_moisture_pct": round(moisture_pct, 1),
                "biomass_ton_ha": round(per_spec["ym_ton_ha"] * ((d + 1) / max(1, days)), 2),
            })

    et_ratio = total_et_a / max(1.0, total_et_m)
    rel_yield = max(0.15, min(1.0, 1.0 - per_spec["ky"] * max(0.0, 1.0 - et_ratio)))
    return {
        "model_used": "FAO33_WATER_PRODUCTION",
        "crop_code": code,
        "crop_name": per_spec["name"],
        "cycle_days": days,
        "total_et_m_mm": round(total_et_m, 1),
        "total_et_a_mm": round(total_et_a, 1),
        "total_effective_rain_mm": round(total_rain_eff, 1),
        "total_irrigation_mm": round(total_irr, 1),
        "biomass_ton_ha": None,
        "estimated_yield_ton_ha": round(per_spec["ym_ton_ha"] * rel_yield, 2),
        "relative_yield_pct": round(rel_yield * 100.0, 1),
        "daily_series": daily_series,
    }
