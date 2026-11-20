import type {
  CropWaterRequirementResult,
  MonthlySolarProduction,
  PumpCalculationResult,
  SolarIrrigationComparisonResult,
} from "@/types/agri";

const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

/**
 * Compares PVGIS monthly solar electricity production against irrigation pump electricity demand.
 * Explicitly accounts for peak-season irrigation timing, diurnal mismatch, and energy/water storage needs.
 */
export function compareSolarAndPumpEnergy(params: {
  solarMonthly: MonthlySolarProduction[];
  pumpResult: PumpCalculationResult;
  cropWaterResult?: CropWaterRequirementResult;
}): SolarIrrigationComparisonResult {
  const { solarMonthly, pumpResult, cropWaterResult } = params;

  const monthly = solarMonthly.map((sol) => {
    const days = DAYS_IN_MONTH[sol.monthIndex - 1] ?? 30;
    const irrMonth = cropWaterResult?.monthly.find((m) => m.monthIndex === sol.monthIndex);

    // If crop irrigation schedule is available, derive monthly pump kWh from gross water volume * specificEnergy (kWh/m³)
    // Otherwise use the configured fixed pump operating hours/day
    const pumpKwh = irrMonth
      ? Number((irrMonth.grossVolumeM3 * pumpResult.specificEnergyKwhPerM3).toFixed(1))
      : Number((pumpResult.dailyEnergyKwh * days).toFixed(1));

    const requiredPumpHoursDay = irrMonth
      ? Number((irrMonth.dailyPeakM3 / Math.max(0.5, pumpResult.flowRateM3Hr)).toFixed(2))
      : Number((pumpResult.dailyEnergyKwh / Math.max(0.1, pumpResult.electricalPowerKw)).toFixed(2));

    const surplusDeficitKwh = Number((sol.monthlyKwh - pumpKwh).toFixed(1));
    const coveragePct =
      pumpKwh > 0 ? Number(Math.min(100, (sol.monthlyKwh / pumpKwh) * 100).toFixed(1)) : 100;

    return {
      monthIndex: sol.monthIndex,
      monthName: sol.monthName,
      solarKwh: Number(sol.monthlyKwh.toFixed(1)),
      pumpKwh,
      surplusDeficitKwh,
      coveragePct,
      requiredPumpHoursDay,
    };
  });

  const annualSolarKwh = Number(monthly.reduce((s, m) => s + m.solarKwh, 0).toFixed(0));
  const annualPumpKwh = Number(monthly.reduce((s, m) => s + m.pumpKwh, 0).toFixed(0));
  const annualNetBalanceKwh = Number((annualSolarKwh - annualPumpKwh).toFixed(0));
  const annualCoveragePct =
    annualPumpKwh > 0
      ? Number(Math.min(100, (annualSolarKwh / annualPumpKwh) * 100).toFixed(1))
      : 100;

  // Identify the worst irrigation coverage month (only among months with meaningful irrigation demand > 10 kWh)
  const activeMonths = monthly.filter((m) => m.pumpKwh >= 10);
  const worstMonth = (activeMonths.length ? activeMonths : monthly).reduce((worst, cur) =>
    cur.coveragePct < worst.coveragePct ? cur : worst
  );

  // Peak power matching check: PV peak DC power vs electrical pump power + startup surge
  const peakSolarMonth = monthly.reduce((best, cur) =>
    cur.solarKwh > best.solarKwh ? cur : best
  );
  const directDriveFeasible =
    worstMonth.coveragePct >= 75 && worstMonth.requiredPumpHoursDay <= 8.5;

  // Recommended battery capacity (kWh) if continuous/night pumping or cloud buffering is needed
  // Using 1 day of peak pumping energy at 80% Depth of Discharge (DoD)
  const peakPumpDayKwh =
    monthly.reduce((maxKwh, m) => {
      const days = DAYS_IN_MONTH[m.monthIndex - 1] ?? 30;
      return Math.max(maxKwh, m.pumpKwh / days);
    }, 0) || pumpResult.dailyEnergyKwh;

  const recommendedBatteryKwh = directDriveFeasible
    ? Number((peakPumpDayKwh * 0.35).toFixed(1))
    : Number(((peakPumpDayKwh * 1.2) / 0.8).toFixed(1));

  // Elevated water tank alternative: 1.5 days of peak irrigation volume avoids expensive battery banks
  const peakDailyWaterM3 = cropWaterResult?.peakDailyWaterM3 ?? pumpResult.dailyVolumeM3;
  const recommendedWaterStorageTankM3 = Number((peakDailyWaterM3 * 1.5).toFixed(0));

  const totalDeficitKwh = monthly.reduce(
    (s, m) => s + (m.surplusDeficitKwh < 0 ? Math.abs(m.surplusDeficitKwh) : 0),
    0
  );
  const estimatedGridDependencyPct =
    annualPumpKwh > 0 ? Number(((totalDeficitKwh / annualPumpKwh) * 100).toFixed(1)) : 0;

  const engineeringWarnings: string[] = [
    `Annual energy balance (${annualCoveragePct}%) does not guarantee off-grid independence: irrigation demand peaks in ${worstMonth.monthName} (${worstMonth.pumpKwh.toFixed(0)} kWh) while winter solar surplus cannot be carried across seasons without net-metering.`,
  ];

  if (worstMonth.coveragePct < 85) {
    engineeringWarnings.push(
      `Peak deficit occurs in ${worstMonth.monthName} (${worstMonth.coveragePct}% solar coverage, ${Math.abs(worstMonth.surplusDeficitKwh).toFixed(0)} kWh shortfall). Consider increasing PV capacity, adding a ${recommendedWaterStorageTankM3} m³ buffer reservoir, or hybrid grid/generator backup.`
    );
  }
  if (worstMonth.requiredPumpHoursDay > 9) {
    engineeringWarnings.push(
      `Peak month requires ${worstMonth.requiredPumpHoursDay.toFixed(1)} pumping hours/day, exceeding typical direct-solar window (~6–8 peak sun hours). Either increase pump flow rate or store energy in batteries/water tank.`
    );
  }
  if (peakSolarMonth.surplusDeficitKwh > 0 && worstMonth.surplusDeficitKwh < 0) {
    engineeringWarnings.push(
      `Seasonal shift detected: ${peakSolarMonth.monthName} shows solar surplus while ${worstMonth.monthName} shows deficit.`
    );
  }

  return {
    annualSolarKwh,
    annualPumpKwh,
    annualNetBalanceKwh,
    annualCoveragePct,
    worstMonthName: worstMonth.monthName,
    worstMonthCoveragePct: worstMonth.coveragePct,
    worstMonthDeficitKwh:
      worstMonth.surplusDeficitKwh < 0 ? Math.abs(worstMonth.surplusDeficitKwh) : 0,
    directDriveFeasible,
    recommendedBatteryKwh,
    recommendedWaterStorageTankM3,
    estimatedGridDependencyPct,
    monthly,
    engineeringWarnings,
  };
}
