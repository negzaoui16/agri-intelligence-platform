import type { PumpCalculationInput, PumpCalculationResult } from "@/types/agri";

const WATER_DENSITY_KG_M3 = 1000;
const GRAVITY_M_S2 = 9.80665;

/**
 * Hazen-Williams pipe friction head loss (meters):
 *   hf = 10.67 * L * Q^1.852 / (C^1.852 * D^4.87)
 */
export function calculateHazenWilliamsFrictionLossM(
  flowRateM3Hr: number,
  pipeLengthM: number,
  pipeDiameterMm: number,
  hazenWilliamsC = 140
): number {
  if (flowRateM3Hr <= 0 || pipeLengthM <= 0 || pipeDiameterMm <= 0) return 0;
  const qM3Sec = flowRateM3Hr / 3600;
  const dMeters = pipeDiameterMm / 1000;
  const hf =
    (10.67 * pipeLengthM * Math.pow(qM3Sec, 1.852)) /
    (Math.pow(hazenWilliamsC, 1.852) * Math.pow(dMeters, 4.87));
  return Number(hf.toFixed(2));
}

/**
 * Deterministic Hydraulic Pump Power & Energy Calculator:
 *   P_hyd (W)  = rho * g * Q_m3s * H_total
 *   P_elec (W) = P_hyd / (eta_pump * eta_motor)
 */
export function calculatePumpEnergy(input: PumpCalculationInput): PumpCalculationResult {
  const flowRateM3Hr = Math.max(0.01, input.flowRateM3Hr);
  const flowRateM3Sec = flowRateM3Hr / 3600;

  const staticHeadM = Math.max(0, input.staticElevationDiffM) + Math.max(0, input.drawdownM ?? 0);
  const pipeFrictionM = calculateHazenWilliamsFrictionLossM(
    flowRateM3Hr,
    input.pipeLengthM,
    input.pipeDiameterMm,
    input.pipeMaterialC ?? 140
  );
  // Standard 15% allowance for bends, valves, suction strainer, and check valve
  const fittingsLossM = Number((pipeFrictionM * 0.15).toFixed(2));
  const operatingPressureHeadM = Math.max(0, input.operatingPressureHeadM);

  const computedTotalHeadM =
    staticHeadM + pipeFrictionM + fittingsLossM + operatingPressureHeadM;
  const totalDynamicHeadM =
    input.overrideTotalDynamicHeadM !== undefined && input.overrideTotalDynamicHeadM > 0
      ? Number(input.overrideTotalDynamicHeadM.toFixed(2))
      : Number(computedTotalHeadM.toFixed(2));

  const pumpEff = Math.min(0.95, Math.max(0.1, input.pumpEfficiencyPct / 100));
  const motorEff = Math.min(0.98, Math.max(0.2, input.motorEfficiencyPct / 100));
  const combinedEff = pumpEff * motorEff;

  const hydraulicPowerKw =
    (WATER_DENSITY_KG_M3 * GRAVITY_M_S2 * flowRateM3Sec * totalDynamicHeadM) / 1000;
  const electricalPowerKw = hydraulicPowerKw / combinedEff;

  const operatingHoursDay = Math.min(24, Math.max(0.25, input.operatingHoursDay));
  const dailyVolumeM3 = flowRateM3Hr * operatingHoursDay;
  const dailyEnergyKwh = electricalPowerKw * operatingHoursDay;
  const monthlyEnergyKwh = dailyEnergyKwh * 30;
  const annualEnergyKwh = dailyEnergyKwh * 365;
  const specificEnergyKwhPerM3 = dailyEnergyKwh / dailyVolumeM3;

  // Rule-of-thumb PV array sizing factor (~1.35x peak motor kW to account for inverter/temperature derating)
  const recommendedPvArrayKwp = electricalPowerKw * 1.35;

  const engineeringNotes: string[] = [
    `Static lift accounts for ${staticHeadM.toFixed(1)} m; straight-line distance to a water source is a lower bound on actual pipeline routing and does not include trench topography or elevation crests.`,
    `Hazen-Williams friction loss (${pipeFrictionM.toFixed(2)} m) + 15% fittings (${fittingsLossM.toFixed(2)} m) assumes C=${input.pipeMaterialC ?? 140} (HDPE/PVC) over ${input.pipeLengthM} m of ${input.pipeDiameterMm} mm ID pipe.`,
    `Emitter operating pressure (${operatingPressureHeadM.toFixed(1)} m ≈ ${(operatingPressureHeadM * 0.0981).toFixed(2)} bar) is required at the field manifold for uniform distribution.`,
    `Combined wire-to-water efficiency is ${(combinedEff * 100).toFixed(1)}% (pump ${input.pumpEfficiencyPct}% × motor/VFD ${input.motorEfficiencyPct}%).`,
  ];

  if (input.staticElevationDiffM < 0) {
    engineeringNotes.unshift(
      `Note: Farm elevation is ${Math.abs(input.staticElevationDiffM).toFixed(1)} m lower than the selected water source. Gravity-fed delivery may offset static head if hydraulic grade line clears intermediate ridges.`
    );
  }

  return {
    flowRateM3Hr: Number(flowRateM3Hr.toFixed(2)),
    flowRateM3Sec: Number(flowRateM3Sec.toFixed(5)),
    staticHeadM: Number(staticHeadM.toFixed(2)),
    frictionLossM: pipeFrictionM,
    fittingsLossM,
    operatingPressureHeadM: Number(operatingPressureHeadM.toFixed(2)),
    totalDynamicHeadM,
    combinedEfficiencyPct: Number((combinedEff * 100).toFixed(1)),
    hydraulicPowerKw: Number(hydraulicPowerKw.toFixed(3)),
    electricalPowerKw: Number(electricalPowerKw.toFixed(3)),
    dailyVolumeM3: Number(dailyVolumeM3.toFixed(1)),
    dailyEnergyKwh: Number(dailyEnergyKwh.toFixed(2)),
    monthlyEnergyKwh: Number(monthlyEnergyKwh.toFixed(1)),
    annualEnergyKwh: Number(annualEnergyKwh.toFixed(0)),
    specificEnergyKwhPerM3: Number(specificEnergyKwhPerM3.toFixed(3)),
    recommendedPvArrayKwp: Number(recommendedPvArrayKwp.toFixed(2)),
    engineeringNotes,
  };
}
