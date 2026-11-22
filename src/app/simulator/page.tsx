"use client";

import * as React from "react";
import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  CloudSun,
  Droplet,
  Expand,
  Play,
  RotateCcw,
  Shield,
  Sprout,
  Timer,
  Trash2,
} from "lucide-react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { FarmerPageHeader } from "@/components/farmer/FarmerUI";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import {
  useCompareScenarios,
  useCreateAndRunScenario,
  useDeleteSimulationScenario,
  useSimulationScenarios,
} from "@/hooks/useFarmBrain";
import { useFarms } from "@/hooks/useFarms";
import { CROP_DATABASE } from "@/lib/engines/fao56-calculator";
import {
  FARMBRAIN_STRINGS,
  localizeAllocationRationale,
  localizeSimulationResult,
} from "@/lib/i18n/farmbrain-strings";
import { cn } from "@/lib/utils";
import type {
  IrrigationScheduleStrategy,
  SimulationComparisonResult,
  SimulationScenarioRecord,
  SimulationScenarioResult,
  SimulationScenarioType,
} from "@/types/agri";

const SCENARIO_PRESETS: Array<{
  type: SimulationScenarioType;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { type: "WATER_SHORTAGE", icon: Droplet },
  { type: "CHANGE_CROP", icon: Sprout },
  { type: "WEATHER_CLIMATE", icon: CloudSun },
  { type: "IRRIGATION_STRATEGY", icon: Timer },
  { type: "FARM_EXPANSION", icon: Expand },
];

export default function SimulatorPage() {
  const { lang, cropLabel } = useLanguage();
  const fb = FARMBRAIN_STRINGS[lang];
  const { activeFarm } = useFarms();
  const farmId = activeFarm?.id ?? null;

  const { data: savedScenarios = [] } = useSimulationScenarios(farmId);
  const createAndRun = useCreateAndRunScenario(farmId);
  const deleteScenario = useDeleteSimulationScenario(farmId);
  const compareMutation = useCompareScenarios(farmId);

  const [scenarioType, setScenarioType] = React.useState<SimulationScenarioType>("WATER_SHORTAGE");
  const [scenarioName, setScenarioName] = React.useState("Limited water 2,000 L/day test");

  // Scenario-specific parameters
  const [availableWaterLitres, setAvailableWaterLitres] = React.useState(2000);
  const [targetPlotId, setTargetPlotId] = React.useState("");
  const [newCropCode, setNewCropCode] = React.useState("olive");
  const [tempDeltaC, setTempDeltaC] = React.useState(3);
  const [rainChangePct, setRainChangePct] = React.useState(-40);
  const [humidityDeltaPct, setHumidityDeltaPct] = React.useState(-10);
  const [strategy, setStrategy] = React.useState<IrrigationScheduleStrategy>("AI_OPTIMIZED");
  const [moistureThresholdPct, setMoistureThresholdPct] = React.useState(45);
  const [addedAreaHa, setAddedAreaHa] = React.useState(2);
  const [addedCropCode, setAddedCropCode] = React.useState("olive");

  const [activeResult, setActiveResult] = React.useState<SimulationScenarioResult | null>(null);
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
  const [comparison, setComparison] = React.useState<SimulationComparisonResult | null>(null);

  React.useEffect(() => {
    if (activeFarm?.crops?.length && !targetPlotId) {
      setTargetPlotId(activeFarm.crops[0].id);
    }
  }, [activeFarm, targetPlotId]);

  const scenarioLabel = (type: SimulationScenarioType) => {
    switch (type) {
      case "WATER_SHORTAGE":
        return fb.scenWaterShortage;
      case "CHANGE_CROP":
        return fb.scenChangeCrop;
      case "WEATHER_CLIMATE":
        return fb.scenWeather;
      case "IRRIGATION_STRATEGY":
        return fb.scenStrategy;
      case "FARM_EXPANSION":
        return fb.scenExpansion;
    }
  };

  const scenarioDesc = (type: SimulationScenarioType) => {
    switch (type) {
      case "WATER_SHORTAGE":
        return fb.scenWaterShortageDesc;
      case "CHANGE_CROP":
        return fb.scenChangeCropDesc;
      case "WEATHER_CLIMATE":
        return fb.scenWeatherDesc;
      case "IRRIGATION_STRATEGY":
        return fb.scenStrategyDesc;
      case "FARM_EXPANSION":
        return fb.scenExpansionDesc;
    }
  };

  const handleSelectPreset = (type: SimulationScenarioType) => {
    setScenarioType(type);
    setScenarioName(`${scenarioLabel(type)} — ${new Date().toLocaleDateString()}`);
  };

  const handleReset = () => {
    setAvailableWaterLitres(2000);
    setNewCropCode("olive");
    setTempDeltaC(3);
    setRainChangePct(-40);
    setHumidityDeltaPct(-10);
    setStrategy("AI_OPTIMIZED");
    setMoistureThresholdPct(45);
    setAddedAreaHa(2);
    setAddedCropCode("olive");
    setActiveResult(null);
  };

  const handleRun = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await createAndRun.mutateAsync({
      name: scenarioName.trim() || scenarioLabel(scenarioType),
      inputs: {
        scenarioType,
        availableWaterLitres,
        targetPlotId: targetPlotId || undefined,
        newCropCode,
        tempDeltaC,
        rainChangePct,
        humidityDeltaPct,
        strategy,
        moistureThresholdPct,
        addedAreaHa,
        addedCropCode,
      },
    });
    if (res.result) {
      setActiveResult(res.result);
    }
  };

  const handleLoadSaved = (s: SimulationScenarioRecord) => {
    setScenarioType(s.scenarioType);
    setScenarioName(s.name);
    if (s.inputs.availableWaterLitres !== undefined)
      setAvailableWaterLitres(s.inputs.availableWaterLitres);
    if (s.inputs.newCropCode) setNewCropCode(s.inputs.newCropCode);
    if (s.inputs.tempDeltaC !== undefined) setTempDeltaC(s.inputs.tempDeltaC);
    if (s.inputs.rainChangePct !== undefined) setRainChangePct(s.inputs.rainChangePct);
    if (s.inputs.strategy) setStrategy(s.inputs.strategy);
    if (s.inputs.addedAreaHa !== undefined) setAddedAreaHa(s.inputs.addedAreaHa);
    if (s.result) setActiveResult(s.result);
  };

  const toggleCompareId = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id].slice(-5)
    );
  };

  const handleCompare = async () => {
    if (selectedIds.length < 2) return;
    const comp = await compareMutation.mutateAsync(selectedIds);
    setComparison(comp);
  };

  if (!activeFarm) {
    return (
      <div className="flex flex-col gap-5">
        <FarmerPageHeader
          mobileLabel={fb.navSimulator}
          title={fb.simPageTitle}
          subtitle={fb.simPageSubtitle}
        />
        <section className="bg-[var(--tp-bg-FFFFFF)] border-[1.5px] border-[var(--tp-bd-E4DFD2)] rounded-[20px] p-6">
          <p className="m-0 text-[18px] font-bold text-[var(--tp-fg-17251C)] mb-3">
            {fb.noFarmSelected}
          </p>
          <Link
            href="/farms"
            className="min-h-[48px] px-6 rounded-full bg-[var(--tp-bg-2E6B3A)] text-white text-[16px] font-bold no-underline inline-flex items-center"
          >
            {fb.goToMyFarm}
          </Link>
        </section>
      </div>
    );
  }

  const selectableCrops = CROP_DATABASE.filter((c) => c.code !== "custom");

  return (
    <div className="flex flex-col gap-6">
      <FarmerPageHeader
        mobileLabel={fb.navSimulator}
        title={fb.simPageTitle}
        subtitle={fb.simPageSubtitle}
        backHref="/farmbrain"
      />

      {/* Explicit Hardware & Farm Isolation Banner */}
      <div className="rounded-[16px] bg-[var(--tp-bg-E6EEF9)] border-[1.5px] border-[var(--tp-bd-E4DFD2)] px-4 py-3 flex items-center gap-2.5 text-[15px] font-bold text-[var(--tp-fg-123766)]">
        <Shield className="w-5 h-5 shrink-0" aria-hidden="true" />
        <span>{fb.simSafetyBanner}</span>
      </div>

      {/* 1. Pick 1 of 5 Scenario Types */}
      <section data-tour="simulator-scenarios" className="flex flex-col gap-3">
        <h2 className="m-0 text-[19px] font-bold text-[var(--tp-fg-17251C)]">
          {fb.chooseScenarioHeading}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {SCENARIO_PRESETS.map(({ type, icon: Icon }) => {
            const active = scenarioType === type;
            return (
              <button
                key={type}
                type="button"
                onClick={() => handleSelectPreset(type)}
                className={cn(
                  "rounded-[18px] border-[1.5px] p-4 text-start flex flex-col gap-2 transition-colors min-h-[120px]",
                  active
                    ? "bg-[var(--tp-bg-E3EFE2)] border-[var(--tp-bd-2E6B3A)] text-[var(--tp-fg-1F4D28)]"
                    : "bg-[var(--tp-bg-FFFFFF)] border-[var(--tp-bd-E4DFD2)] text-[var(--tp-fg-17251C)] hover:bg-[var(--tp-bg-F6F4EE)]"
                )}
              >
                <Icon className="w-6 h-6 shrink-0" aria-hidden="true" />
                <b className="text-[17px] leading-snug">{scenarioLabel(type)}</b>
                <span className="text-[14px] text-[var(--tp-fg-4A5A4F)] leading-snug">
                  {scenarioDesc(type)}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* 2. Scenario Controls Form */}
      <form
        onSubmit={handleRun}
        className="bg-[var(--tp-bg-FFFFFF)] border-[1.5px] border-[var(--tp-bd-E4DFD2)] rounded-[20px] p-5 lg:p-6 flex flex-col gap-4"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="flex flex-col gap-1.5 text-[15px] font-bold text-[var(--tp-fg-17251C)]">
            <span>{fb.scenarioNameLabel}</span>
            <input
              type="text"
              value={scenarioName}
              onChange={(e) => setScenarioName(e.target.value)}
              className="min-h-[48px] rounded-[12px] border-[1.5px] border-[var(--tp-bd-C9C3B3)] bg-[var(--tp-bg-FFFFFF)] px-3.5 text-[16px]"
            />
          </label>

          {scenarioType === "WATER_SHORTAGE" && (
            <div className="flex flex-col gap-1.5">
              <span className="text-[15px] font-bold text-[var(--tp-fg-17251C)]">
                {fb.availableWaterLabel}
              </span>
              <div className="flex flex-wrap gap-2">
                {[1000, 2000, 5000].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setAvailableWaterLitres(val)}
                    className={cn(
                      "min-h-[46px] px-4 rounded-full border-[1.5px] text-[15px] font-bold",
                      availableWaterLitres === val
                        ? "bg-[var(--tp-bg-2E6B3A)] border-[var(--tp-bg-2E6B3A)] text-white"
                        : "bg-[var(--tp-bg-FFFFFF)] border-[var(--tp-bd-C9C3B3)] text-[var(--tp-fg-17251C)]"
                    )}
                  >
                    {val.toLocaleString()} L
                  </button>
                ))}
                <input
                  type="number"
                  min="0"
                  step="100"
                  aria-label={fb.customLitresLabel}
                  value={availableWaterLitres}
                  onChange={(e) => setAvailableWaterLitres(Number(e.target.value || 0))}
                  className="w-[140px] min-h-[46px] rounded-[12px] border-[1.5px] border-[var(--tp-bd-C9C3B3)] px-3 text-[16px]"
                />
              </div>
            </div>
          )}

          {scenarioType === "CHANGE_CROP" && (
            <>
              {activeFarm.crops && activeFarm.crops.length > 0 && (
                <label className="flex flex-col gap-1.5 text-[15px] font-bold text-[var(--tp-fg-17251C)]">
                  <span>{fb.pickPlotLabel}</span>
                  <select
                    value={targetPlotId}
                    onChange={(e) => setTargetPlotId(e.target.value)}
                    className="min-h-[48px] rounded-[12px] border-[1.5px] border-[var(--tp-bd-C9C3B3)] bg-[var(--tp-bg-FFFFFF)] px-3 text-[16px]"
                  >
                    {activeFarm.crops.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.cropName} ({c.cultivatedAreaHa} ha)
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <label className="flex flex-col gap-1.5 text-[15px] font-bold text-[var(--tp-fg-17251C)]">
                <span>{fb.newCropLabel}</span>
                <select
                  value={newCropCode}
                  onChange={(e) => setNewCropCode(e.target.value)}
                  className="min-h-[48px] rounded-[12px] border-[1.5px] border-[var(--tp-bd-C9C3B3)] bg-[var(--tp-bg-FFFFFF)] px-3 text-[16px]"
                >
                  {selectableCrops.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
            </>
          )}

          {scenarioType === "WEATHER_CLIMATE" && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <label className="flex flex-col gap-1 text-[14px] font-bold text-[var(--tp-fg-17251C)]">
                <span>
                  {fb.tempShiftLabel}: {tempDeltaC >= 0 ? `+${tempDeltaC}` : tempDeltaC}°C
                </span>
                <input
                  type="range"
                  min="-3"
                  max="7"
                  step="0.5"
                  value={tempDeltaC}
                  onChange={(e) => setTempDeltaC(Number(e.target.value))}
                  className="accent-[var(--tp-fg-2E6B3A)]"
                />
              </label>
              <label className="flex flex-col gap-1 text-[14px] font-bold text-[var(--tp-fg-17251C)]">
                <span>
                  {fb.rainShiftLabel}: {rainChangePct}%
                </span>
                <input
                  type="range"
                  min="-80"
                  max="80"
                  step="10"
                  value={rainChangePct}
                  onChange={(e) => setRainChangePct(Number(e.target.value))}
                  className="accent-[var(--tp-fg-2E6B3A)]"
                />
              </label>
              <label className="flex flex-col gap-1 text-[14px] font-bold text-[var(--tp-fg-17251C)]">
                <span>
                  {fb.humidityShiftLabel}: {humidityDeltaPct}%
                </span>
                <input
                  type="range"
                  min="-25"
                  max="25"
                  step="5"
                  value={humidityDeltaPct}
                  onChange={(e) => setHumidityDeltaPct(Number(e.target.value))}
                  className="accent-[var(--tp-fg-2E6B3A)]"
                />
              </label>
            </div>
          )}

          {scenarioType === "IRRIGATION_STRATEGY" && (
            <>
              <label className="flex flex-col gap-1.5 text-[15px] font-bold text-[var(--tp-fg-17251C)]">
                <span>{fb.strategyLabel}</span>
                <select
                  value={strategy}
                  onChange={(e) => setStrategy(e.target.value as IrrigationScheduleStrategy)}
                  className="min-h-[48px] rounded-[12px] border-[1.5px] border-[var(--tp-bd-C9C3B3)] bg-[var(--tp-bg-FFFFFF)] px-3 text-[16px]"
                >
                  <option value="AI_OPTIMIZED">{fb.stratAiOptimized}</option>
                  <option value="MOISTURE_TRIGGER">{fb.stratMoistureTrigger}</option>
                  <option value="EVERY_2_DAYS">{fb.stratEvery2Days}</option>
                  <option value="DAILY">{fb.stratDaily}</option>
                  <option value="CURRENT">{fb.stratCurrent}</option>
                </select>
              </label>
              {strategy === "MOISTURE_TRIGGER" && (
                <label className="flex flex-col gap-1.5 text-[15px] font-bold text-[var(--tp-fg-17251C)]">
                  <span>
                    {fb.thresholdLabel}: {moistureThresholdPct}%
                  </span>
                  <input
                    type="range"
                    min="20"
                    max="75"
                    step="5"
                    value={moistureThresholdPct}
                    onChange={(e) => setMoistureThresholdPct(Number(e.target.value))}
                    className="accent-[var(--tp-fg-2E6B3A)]"
                  />
                </label>
              )}
            </>
          )}

          {scenarioType === "FARM_EXPANSION" && (
            <>
              <label className="flex flex-col gap-1.5 text-[15px] font-bold text-[var(--tp-fg-17251C)]">
                <span>{fb.addedAreaLabel}</span>
                <input
                  type="number"
                  min="0.1"
                  step="0.5"
                  value={addedAreaHa}
                  onChange={(e) => setAddedAreaHa(Number(e.target.value || 1))}
                  className="min-h-[48px] rounded-[12px] border-[1.5px] border-[var(--tp-bd-C9C3B3)] bg-[var(--tp-bg-FFFFFF)] px-3 text-[16px]"
                />
              </label>
              <label className="flex flex-col gap-1.5 text-[15px] font-bold text-[var(--tp-fg-17251C)]">
                <span>{fb.addedCropLabel}</span>
                <select
                  value={addedCropCode}
                  onChange={(e) => setAddedCropCode(e.target.value)}
                  className="min-h-[48px] rounded-[12px] border-[1.5px] border-[var(--tp-bd-C9C3B3)] bg-[var(--tp-bg-FFFFFF)] px-3 text-[16px]"
                >
                  {selectableCrops.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
            </>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-1">
          <button
            type="submit"
            disabled={createAndRun.isPending}
            className="min-h-[50px] px-6 rounded-full bg-[var(--tp-bg-2E6B3A)] text-white text-[16px] font-bold inline-flex items-center gap-2 hover:bg-[var(--tp-bg-23542D)] disabled:opacity-60"
          >
            <Play className="w-4 h-4" aria-hidden="true" />
            <span>{createAndRun.isPending ? fb.runningSimBtn : fb.runAndSaveBtn}</span>
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="min-h-[50px] px-5 rounded-full border-[1.5px] border-[var(--tp-bd-C9C3B3)] bg-[var(--tp-bg-FFFFFF)] text-[var(--tp-fg-17251C)] text-[15px] font-bold inline-flex items-center gap-2"
          >
            <RotateCcw className="w-4 h-4" aria-hidden="true" />
            <span>{fb.resetInputsBtn}</span>
          </button>
        </div>
      </form>

      {/* 3. Active Simulation Result */}
      {activeResult && (() => {
        const locRes = localizeSimulationResult(activeResult, lang);
        return (
        <section className="bg-[var(--tp-bg-FFFFFF)] border-[1.5px] border-[var(--tp-bd-E4DFD2)] rounded-[20px] p-5 lg:p-6 flex flex-col gap-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="m-0 text-[22px] font-bold text-[var(--tp-fg-17251C)]">
              {fb.resultHeadline}: {locRes.headlineOutcome}
            </h2>
            <span
              className={cn(
                "px-3.5 py-1 rounded-full text-[14px] font-bold inline-flex items-center gap-1.5",
                activeResult.pumpOverloadRisk
                  ? "bg-[var(--tp-bg-FCEFD9)] text-[var(--tp-fg-8A4B00)]"
                  : "bg-[var(--tp-bg-E3EFE2)] text-[var(--tp-fg-1F4D28)]"
              )}
            >
              {activeResult.pumpOverloadRisk ? (
                <AlertTriangle className="w-4 h-4" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
              <span>
                {activeResult.pumpOverloadRisk ? fb.pumpOverloadLabel : fb.pumpOkLabel} (
                {activeResult.pumpRequiredHoursDay} {fb.hoursPerDayUnit})
              </span>
            </span>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="rounded-[14px] bg-[var(--tp-bg-F6F4EE)] p-3.5">
              <span className="text-[14px] text-[var(--tp-fg-4A5A4F)] block">
                {fb.waterImpactLabel}
              </span>
              <b className="text-[22px] text-[var(--tp-fg-17251C)]">
                {activeResult.waterDeltaM3Season >= 0 ? "+" : ""}
                {activeResult.waterDeltaM3Season.toLocaleString()} m³ ({activeResult.waterDeltaPct}%)
              </b>
            </div>
            <div className="rounded-[14px] bg-[var(--tp-bg-F6F4EE)] p-3.5">
              <span className="text-[14px] text-[var(--tp-fg-4A5A4F)] block">
                {fb.energyImpactLabel}
              </span>
              <b className="text-[22px] text-[var(--tp-fg-17251C)]">
                {activeResult.energyDeltaKwhSeason >= 0 ? "+" : ""}
                {activeResult.energyDeltaKwhSeason.toLocaleString()} kWh
              </b>
            </div>
            <div className="rounded-[14px] bg-[var(--tp-bg-F6F4EE)] p-3.5">
              <span className="text-[14px] text-[var(--tp-fg-4A5A4F)] block">
                {fb.yieldImpactLabel}
              </span>
              <b className="text-[22px] text-[var(--tp-fg-17251C)]">
                {activeResult.estimatedYieldChangePct >= 0 ? "+" : ""}
                {activeResult.estimatedYieldChangePct}%
              </b>
            </div>
            <div className="rounded-[14px] bg-[var(--tp-bg-F6F4EE)] p-3.5">
              <span className="text-[14px] text-[var(--tp-fg-4A5A4F)] block">
                {fb.costImpactLabel}
              </span>
              <b className="text-[22px] text-[var(--tp-fg-17251C)]">
                {activeResult.estimatedCostDeltaTnd !== null
                  ? `${activeResult.estimatedCostDeltaTnd >= 0 ? "+" : ""}${activeResult.estimatedCostDeltaTnd} TND`
                  : "--"}
              </b>
            </div>
          </div>

          {/* 3-Part Plain Explanation */}
          <div className="rounded-[16px] bg-[var(--tp-bg-F6F4EE)] border border-[var(--tp-bd-E4DFD2)] p-4 flex flex-col gap-1.5 text-[16px]">
            <p className="m-0 font-bold text-[var(--tp-fg-17251C)]">
              {fb.whatIsHappening}: {locRes.whatChanges}
            </p>
            <p className="m-0 text-[var(--tp-fg-4A5A4F)]">
              <b>{fb.whyLabel}:</b> {locRes.whyItHappens}
            </p>
            <p className="m-0 font-bold text-[var(--tp-fg-1F4D28)]">
              {fb.whatToDo}: {locRes.whatFarmerShouldDo}
            </p>
          </div>

          {/* Water Shortage Allocation Breakdown */}
          {activeResult.allocations && activeResult.allocations.length > 0 && (
            <div className="flex flex-col gap-2.5">
              <h3 className="m-0 text-[18px] font-bold text-[var(--tp-fg-17251C)]">
                {fb.allocationHeading}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {activeResult.allocations.map((alloc) => {
                  const localizedCrop = cropLabel(alloc.cropName, alloc.cropCode);
                  const localizedRationale = localizeAllocationRationale(
                    alloc.fulfillmentPct,
                    localizedCrop,
                    lang
                  );
                  return (
                  <div
                    key={alloc.plotId}
                    className="rounded-[14px] border-[1.5px] border-[var(--tp-bd-E4DFD2)] p-3.5 flex flex-col gap-1"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <b className="text-[17px] text-[var(--tp-fg-17251C)]">
                        {localizedCrop} ({alloc.areaHa} ha)
                      </b>
                      <span className="px-2.5 py-0.5 rounded-full bg-[var(--tp-bg-E3EFE2)] text-[var(--tp-fg-1F4D28)] text-[14px] font-bold">
                        {alloc.allocatedLitresDay.toLocaleString()} L/d ({alloc.fulfillmentPct}%)
                      </span>
                    </div>
                    <p className="m-0 text-[14px] text-[var(--tp-fg-4A5A4F)]">
                      {localizedRationale ?? alloc.rationale}
                    </p>
                  </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 30-Day Soil Trajectory Chart */}
          <div className="flex flex-col gap-2">
            <h3 className="m-0 text-[18px] font-bold text-[var(--tp-fg-17251C)]">
              {fb.trajectoryHeading}
            </h3>
            <div dir="ltr" className="w-full h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={activeResult.trajectory30d}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(120,120,110,0.2)" />
                  <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="baselineMoisturePct"
                    name={fb.withoutSmartLabel}
                    stroke="#8A4B00"
                    strokeDasharray="4 4"
                    dot={false}
                    strokeWidth={2}
                  />
                  <Line
                    type="monotone"
                    dataKey="simulatedMoisturePct"
                    name={fb.resultHeadline}
                    stroke="#2E6B3A"
                    dot={false}
                    strokeWidth={2.5}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>
        );
      })()}

      {/* 4. Saved Scenarios & Side-by-Side Comparison */}
      <section className="bg-[var(--tp-bg-FFFFFF)] border-[1.5px] border-[var(--tp-bd-E4DFD2)] rounded-[20px] p-5 lg:p-6 flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="m-0 text-[19px] font-bold text-[var(--tp-fg-17251C)]">
            {fb.savedScenariosHeading}
          </h2>
          {selectedIds.length >= 2 && (
            <button
              type="button"
              disabled={compareMutation.isPending}
              onClick={handleCompare}
              className="min-h-[44px] px-5 rounded-full bg-[var(--tp-bg-1D4F91)] text-white text-[15px] font-bold"
            >
              {compareMutation.isPending ? fb.comparingBtn : fb.compareSelectedBtn} (
              {selectedIds.length})
            </button>
          )}
        </div>

        {savedScenarios.length === 0 ? (
          <p className="m-0 text-[16px] text-[var(--tp-fg-4A5A4F)]">{fb.noSavedScenarios}</p>
        ) : (
          <div className="flex flex-col gap-2.5">
            {savedScenarios.map((scen) => (
              <div
                key={scen.id}
                className="rounded-[14px] border border-[var(--tp-bd-E4DFD2)] p-3.5 flex flex-wrap items-center justify-between gap-3"
              >
                <label className="flex items-center gap-3 cursor-pointer min-w-0">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(scen.id)}
                    onChange={() => toggleCompareId(scen.id)}
                    className="w-5 h-5 accent-[var(--tp-fg-2E6B3A)]"
                  />
                  <div className="min-w-0">
                    <b className="text-[16px] text-[var(--tp-fg-17251C)] block truncate">
                      {scen.name}
                    </b>
                    <span className="text-[14px] text-[var(--tp-fg-4A5A4F)] block truncate">
                      {scen.result
                        ? localizeSimulationResult(scen.result, lang).headlineOutcome
                        : scenarioLabel(scen.scenarioType)}
                    </span>
                  </div>
                </label>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleLoadSaved(scen)}
                    className="min-h-[40px] px-4 rounded-full border border-[var(--tp-bd-C9C3B3)] text-[14px] font-bold text-[var(--tp-fg-17251C)]"
                  >
                    {fb.openScenarioBtn}
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteScenario.mutate(scen.id)}
                    aria-label={fb.deleteScenarioBtn}
                    className="min-h-[40px] px-3 rounded-full border border-[var(--tp-bd-E2B66B)] text-[var(--tp-fg-8A4B00)] inline-flex items-center gap-1 text-[14px] font-bold"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>{fb.deleteScenarioBtn}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {comparison && (
          <div className="pt-3 border-t border-[var(--tp-bd-E4DFD2)] flex flex-col gap-3">
            <h3 className="m-0 text-[18px] font-bold text-[var(--tp-fg-17251C)]">
              {fb.comparisonHeading}
            </h3>
            <p className="m-0 text-[15px] text-[var(--tp-fg-4A5A4F)]">{comparison.summary}</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {comparison.scenarios.map((row) => (
                <div
                  key={row.id}
                  className="rounded-[14px] bg-[var(--tp-bg-F6F4EE)] border border-[var(--tp-bd-E4DFD2)] p-3.5 flex flex-col gap-1.5"
                >
                  <b className="text-[16px] text-[var(--tp-fg-17251C)]">{row.name}</b>
                  <div className="flex flex-wrap gap-1">
                    {comparison.bestOverallId === row.id && (
                      <span className="px-2 py-0.5 rounded-full bg-[var(--tp-bg-2E6B3A)] text-white text-[12px] font-bold">
                        {fb.bestOverallBadge}
                      </span>
                    )}
                    {comparison.bestForWaterSavingId === row.id && (
                      <span className="px-2 py-0.5 rounded-full bg-[var(--tp-bg-E6EEF9)] text-[var(--tp-fg-123766)] text-[12px] font-bold">
                        {fb.bestWaterBadge}
                      </span>
                    )}
                    {comparison.bestForYieldProtectionId === row.id && (
                      <span className="px-2 py-0.5 rounded-full bg-[var(--tp-bg-E3EFE2)] text-[var(--tp-fg-1F4D28)] text-[12px] font-bold">
                        {fb.bestYieldBadge}
                      </span>
                    )}
                  </div>
                  <div className="text-[14px] text-[var(--tp-fg-4A5A4F)]">
                    Water: {row.waterDeltaM3Season >= 0 ? "+" : ""}
                    {row.waterDeltaM3Season} m³ · Yield: {row.estimatedYieldChangePct >= 0 ? "+" : ""}
                    {row.estimatedYieldChangePct}%
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
