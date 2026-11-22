"use client";

import * as React from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Brain,
  CheckCircle2,
  Clock,
  Droplets,
  Gauge,
  RefreshCw,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Sun,
  Wallet,
  Zap,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { FarmerPageHeader } from "@/components/farmer/FarmerUI";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import { useFarmBrainOverview, useRecalculateFarmBrain } from "@/hooks/useFarmBrain";
import { useFarms } from "@/hooks/useFarms";
import {
  FARMBRAIN_STRINGS,
  localizeAnomalyReason,
  localizeBrainRecommendation,
  localizeCompletenessLabel,
  localizeTrackingExplanation,
} from "@/lib/i18n/farmbrain-strings";
import { cn } from "@/lib/utils";
import type { FarmBrainProvenance } from "@/types/agri";

function provenanceBadge(p: FarmBrainProvenance, fb: (typeof FARMBRAIN_STRINGS)["en"]) {
  switch (p) {
    case "MEASURED":
      return {
        label: fb.provMeasured,
        cls: "bg-[var(--tp-bg-E3EFE2)] text-[var(--tp-fg-1F4D28)] border-[var(--tp-bd-E4DFD2)]",
      };
    case "FARMER_PROVIDED":
      return {
        label: fb.provFarmerProvided,
        cls: "bg-[var(--tp-bg-E6EEF9)] text-[var(--tp-fg-123766)] border-[var(--tp-bd-E4DFD2)]",
      };
    case "ESTIMATED":
      return {
        label: fb.provEstimated,
        cls: "bg-[var(--tp-bg-FCEFD9)] text-[var(--tp-fg-6B3A00)] border-[var(--tp-bd-E2B66B)]",
      };
    default:
      return {
        label: fb.provDefault,
        cls: "bg-[var(--tp-bg-F6F4EE)] text-[var(--tp-fg-4A5A4F)] border-[var(--tp-bd-E4DFD2)]",
      };
  }
}

export default function FarmBrainPage() {
  const { lang, cropLabel } = useLanguage();
  const fb = FARMBRAIN_STRINGS[lang];
  const { activeFarm } = useFarms();
  const farmId = activeFarm?.id ?? null;

  const { data, isLoading } = useFarmBrainOverview(farmId);
  const recalculate = useRecalculateFarmBrain(farmId);
  const analysis = data?.analysis ?? null;

  const [waterTariff, setWaterTariff] = React.useState("");
  const [elecTariff, setElecTariff] = React.useState("");

  React.useEffect(() => {
    if (analysis) {
      setWaterTariff(
        analysis.savings.waterTariffTndPerM3 !== null
          ? String(analysis.savings.waterTariffTndPerM3)
          : ""
      );
      setElecTariff(
        analysis.savings.electricityTariffTndPerKwh !== null
          ? String(analysis.savings.electricityTariffTndPerKwh)
          : ""
      );
    }
  }, [analysis?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleRecalculateWithRates = (e: React.FormEvent) => {
    e.preventDefault();
    const wVal = waterTariff.trim() === "" ? null : Number(waterTariff);
    const eVal = elecTariff.trim() === "" ? null : Number(elecTariff);
    recalculate.mutate({
      waterTariffTndPerM3: Number.isFinite(wVal as number) ? (wVal as number) : null,
      electricityTariffTndPerKwh: Number.isFinite(eVal as number) ? (eVal as number) : null,
    });
  };

  if (!activeFarm) {
    return (
      <div className="flex flex-col gap-5">
        <FarmerPageHeader
          mobileLabel={fb.navFarmBrain}
          title={fb.brainPageTitle}
          subtitle={fb.brainPageSubtitle}
        />
        <section className="bg-[var(--tp-bg-FFFFFF)] border-[1.5px] border-[var(--tp-bd-E4DFD2)] rounded-[20px] p-6 flex flex-col gap-4 items-start">
          <p className="m-0 text-[18px] text-[var(--tp-fg-17251C)] font-bold">
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

  return (
    <div className="flex flex-col gap-6">
      <FarmerPageHeader
        mobileLabel={fb.navFarmBrain}
        title={fb.brainPageTitle}
        subtitle={fb.brainPageSubtitle}
        rightAction={
          <div className="hidden lg:flex flex-wrap items-center gap-2.5">
            <Link
              href="/simulator"
              className="min-h-[48px] px-5 rounded-full border-[1.5px] border-[var(--tp-bd-2E6B3A)] bg-[var(--tp-bg-FFFFFF)] text-[var(--tp-fg-1F4D28)] text-[16px] font-bold no-underline inline-flex items-center gap-2"
            >
              <SlidersHorizontal className="w-4 h-4" aria-hidden="true" />
              <span>{fb.homeOpenSimulator}</span>
            </Link>
            <button
              type="button"
              disabled={recalculate.isPending}
              onClick={() => recalculate.mutate({})}
              className="min-h-[48px] px-5 rounded-full bg-[var(--tp-bg-2E6B3A)] text-white text-[16px] font-bold inline-flex items-center gap-2 hover:bg-[var(--tp-bg-23542D)] disabled:opacity-60"
            >
              <RefreshCw
                className={cn("w-4 h-4", recalculate.isPending && "animate-spin")}
                aria-hidden="true"
              />
              <span>
                {recalculate.isPending ? fb.recalculatingBtn : fb.recalculateBtn}
              </span>
            </button>
          </div>
        }
      />

      {/* Mobile Action Strip below Header so 390px back button never overlaps */}
      <div className="flex lg:hidden flex-wrap items-center gap-2.5">
        <Link
          href="/simulator"
          className="min-h-[46px] px-4 rounded-full border-[1.5px] border-[var(--tp-bd-2E6B3A)] bg-[var(--tp-bg-FFFFFF)] text-[var(--tp-fg-1F4D28)] text-[15px] font-bold no-underline inline-flex items-center gap-2"
        >
          <SlidersHorizontal className="w-4 h-4" aria-hidden="true" />
          <span>{fb.homeOpenSimulator}</span>
        </Link>
        <button
          type="button"
          disabled={recalculate.isPending}
          onClick={() => recalculate.mutate({})}
          className="min-h-[46px] px-4 rounded-full bg-[var(--tp-bg-2E6B3A)] text-white text-[15px] font-bold inline-flex items-center gap-2 hover:bg-[var(--tp-bg-23542D)] disabled:opacity-60"
        >
          <RefreshCw
            className={cn("w-4 h-4", recalculate.isPending && "animate-spin")}
            aria-hidden="true"
          />
          <span>
            {recalculate.isPending ? fb.recalculatingBtn : fb.recalculateBtn}
          </span>
        </button>
      </div>

      {isLoading || !analysis ? (
        <section className="bg-[var(--tp-bg-FFFFFF)] border-[1.5px] border-[var(--tp-bd-E4DFD2)] rounded-[20px] p-6">
          <p className="m-0 text-[18px] font-bold text-[var(--tp-fg-4A5A4F)]">
            {fb.loadingBrain}
          </p>
        </section>
      ) : (
        <>
          {/* Sensor Anomaly Banner if triggered */}
          {analysis.soilAnomalyDetected && (
            <section className="bg-[var(--tp-bg-FCEFD9)] border-[1.5px] border-[var(--tp-bd-E2B66B)] rounded-[18px] p-4 lg:p-5 flex items-start gap-3">
              <AlertTriangle className="w-6 h-6 text-[var(--tp-fg-8A4B00)] shrink-0 mt-0.5" />
              <div className="flex flex-col gap-1">
                <b className="text-[18px] text-[var(--tp-fg-6B3A00)]">{fb.sensorAnomalyAlert}</b>
                <p className="m-0 text-[16px] text-[var(--tp-fg-17251C)]">
                  {localizeAnomalyReason(analysis.soilAnomalyReason, lang)}
                </p>
              </div>
            </section>
          )}

          {/* Solar Free Electricity Highlight */}
          {analysis.savings.solarCoversPumpElectricity && (
            <div className="rounded-[16px] bg-[var(--tp-bg-E3EFE2)] border-[1.5px] border-[var(--tp-bd-E4DFD2)] px-4 py-3 flex items-center gap-2.5 text-[16px] font-bold text-[var(--tp-fg-1F4D28)]">
              <Sun className="w-5 h-5 shrink-0" aria-hidden="true" />
              <span>{fb.solarFreeElectricityBadge}</span>
            </div>
          )}

          {/* 4 Big Visual Savings Cards */}
          <div data-tour="farmbrain-savings" className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <article
              style={{ borderTopWidth: 3, borderTopColor: "var(--tp-fg-1D4F91)" }}
              className="tp-card bg-[var(--tp-bg-FFFFFF)] border-[1.5px] border-[var(--tp-bd-E4DFD2)] rounded-[20px] p-5 flex flex-col gap-2"
            >
              <div className="flex items-center justify-between gap-2 text-[var(--tp-fg-1D4F91)]">
                <span className="text-[15px] font-bold">{fb.waterSavedTitle}</span>
                <span className="w-9 h-9 rounded-[10px] bg-[var(--tp-bg-E6EEF9)] flex items-center justify-center shrink-0">
                  <Droplets className="w-5 h-5" aria-hidden="true" />
                </span>
              </div>
              <div dir="ltr" style={{ unicodeBidi: "isolate" }} className="tp-tabular text-[30px] font-bold text-[var(--tp-fg-17251C)] leading-tight w-fit">
                {analysis.savings.waterSavingsPct}%
              </div>
              <p className="m-0 tp-tabular text-[15px] font-bold text-[var(--tp-fg-2E6B3A)]">
                <span dir="ltr" style={{ unicodeBidi: "isolate" }} className="inline-block">
                  {analysis.savings.waterSavedM3Yr.toLocaleString()}
                </span>{" "}
                {fb.m3Unit} (
                <span dir="ltr" style={{ unicodeBidi: "isolate" }} className="inline-block">
                  {analysis.savings.waterSavedLitresYr.toLocaleString()}
                </span>{" "}
                {fb.litresUnit})
              </p>
            </article>

            <article
              style={{ borderTopWidth: 3, borderTopColor: "var(--tp-fg-9A6400)" }}
              className="tp-card bg-[var(--tp-bg-FFFFFF)] border-[1.5px] border-[var(--tp-bd-E4DFD2)] rounded-[20px] p-5 flex flex-col gap-2"
            >
              <div className="flex items-center justify-between gap-2 text-[var(--tp-fg-9A6400)]">
                <span className="text-[15px] font-bold">{fb.energySavedTitle}</span>
                <span className="w-9 h-9 rounded-[10px] bg-[var(--tp-bg-F6ECD6)] flex items-center justify-center shrink-0">
                  <Zap className="w-5 h-5" aria-hidden="true" />
                </span>
              </div>
              <div dir="ltr" style={{ unicodeBidi: "isolate" }} className="tp-tabular text-[30px] font-bold text-[var(--tp-fg-17251C)] leading-tight w-fit">
                {analysis.savings.energySavedKwhYr.toLocaleString()}
              </div>
              <p className="m-0 tp-tabular text-[15px] font-bold text-[var(--tp-fg-4A5A4F)]">
                {fb.kwhUnit} (
                <span dir="ltr" style={{ unicodeBidi: "isolate" }} className="inline-block">
                  {analysis.savings.energySavingsPct}%
                </span>
                )
              </p>
            </article>

            <article
              style={{ borderTopWidth: 3, borderTopColor: "var(--tp-fg-2E6B3A)" }}
              className="tp-card bg-[var(--tp-bg-FFFFFF)] border-[1.5px] border-[var(--tp-bd-E4DFD2)] rounded-[20px] p-5 flex flex-col gap-2"
            >
              <div className="flex items-center justify-between gap-2 text-[var(--tp-fg-2E6B3A)]">
                <span className="text-[15px] font-bold">{fb.timeSavedTitle}</span>
                <span className="w-9 h-9 rounded-[10px] bg-[var(--tp-bg-E3EFE2)] flex items-center justify-center shrink-0">
                  <Clock className="w-5 h-5" aria-hidden="true" />
                </span>
              </div>
              <div dir="ltr" style={{ unicodeBidi: "isolate" }} className="tp-tabular text-[30px] font-bold text-[var(--tp-fg-17251C)] leading-tight w-fit">
                {analysis.savings.timeSavedHoursYr.toLocaleString()}
              </div>
              <p className="m-0 tp-tabular text-[15px] font-bold text-[var(--tp-fg-4A5A4F)]">
                {fb.hoursUnit}
              </p>
            </article>

            <article
              style={{ borderTopWidth: 3, borderTopColor: "var(--tp-fg-1F4D28)" }}
              className="tp-card bg-[var(--tp-bg-FFFFFF)] border-[1.5px] border-[var(--tp-bd-E4DFD2)] rounded-[20px] p-5 flex flex-col gap-2"
            >
              <div className="flex items-center justify-between gap-2 text-[var(--tp-fg-1F4D28)]">
                <span className="text-[15px] font-bold">{fb.moneySavedTitle}</span>
                <span className="w-9 h-9 rounded-[10px] bg-[var(--tp-bg-E3EFE2)] flex items-center justify-center shrink-0">
                  <Wallet className="w-5 h-5" aria-hidden="true" />
                </span>
              </div>
              <div className="tp-tabular text-[30px] font-bold text-[var(--tp-fg-17251C)] leading-tight">
                {analysis.savings.totalEstimatedSavingsTndYr.toLocaleString()} {fb.tndUnit}
              </div>
              <p className="m-0 text-[14px] text-[var(--tp-fg-4A5A4F)]">
                {analysis.savings.waterTariffTndPerM3 === null &&
                (analysis.savings.solarCoversPumpElectricity ||
                  analysis.savings.electricityTariffTndPerKwh === null)
                  ? fb.tariffsNeededNote
                  : `${analysis.savings.waterCostSavedTndYr} TND water · ${analysis.savings.energyCostSavedTndYr} TND grid power`}
              </p>
            </article>
          </div>

          {/* Verified Savings Tier & Completeness Score */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <section className="tp-card bg-[var(--tp-bg-FFFFFF)] border-[1.5px] border-[var(--tp-bd-E4DFD2)] rounded-[20px] p-5 flex flex-col gap-3">
              <div className="flex items-center justify-between gap-2">
                <h2 className="m-0 text-[19px] font-bold text-[var(--tp-fg-17251C)] flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-[var(--tp-fg-2E6B3A)]" />
                  <span>{fb.trackingTitle}</span>
                </h2>
                <span className="px-3 py-1 rounded-full text-[13px] font-bold bg-[var(--tp-bg-E3EFE2)] text-[var(--tp-fg-1F4D28)]">
                  {analysis.verifiedTracking.tier === "VERIFIED_ACTUAL"
                    ? fb.tierVerifiedActual
                    : analysis.verifiedTracking.tier === "SENSOR_UPDATED_PROJECTION"
                      ? fb.tierSensorUpdated
                      : fb.tierInitial}
                </span>
              </div>
              <p className="m-0 text-[16px] text-[var(--tp-fg-4A5A4F)] leading-relaxed">
                {localizeTrackingExplanation(
                  analysis.verifiedTracking.tier,
                  analysis.verifiedTracking.observedPumpCycles24h,
                  analysis.verifiedTracking.observedPumpHours24h,
                  analysis.verifiedTracking.explanation,
                  lang
                )}
              </p>
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="rounded-[14px] bg-[var(--tp-bg-F6F4EE)] p-3">
                  <span className="text-[13px] text-[var(--tp-fg-4A5A4F)] block">
                    {fb.observedCyclesLabel}
                  </span>
                  <b className="text-[20px] text-[var(--tp-fg-17251C)]">
                    {analysis.verifiedTracking.observedPumpCycles24h}
                  </b>
                </div>
                <div className="rounded-[14px] bg-[var(--tp-bg-F6F4EE)] p-3">
                  <span className="text-[13px] text-[var(--tp-fg-4A5A4F)] block">
                    {fb.observedHoursLabel}
                  </span>
                  <b className="text-[20px] text-[var(--tp-fg-17251C)]">
                    {analysis.verifiedTracking.observedPumpHours24h} h
                  </b>
                </div>
              </div>
            </section>

            {/* Optional TND Tariff Input Card */}
            <section className="bg-[var(--tp-bg-FFFFFF)] border-[1.5px] border-[var(--tp-bd-E4DFD2)] rounded-[20px] p-5 flex flex-col gap-3">
              <h2 className="m-0 text-[19px] font-bold text-[var(--tp-fg-17251C)]">
                {fb.tariffTitle}
              </h2>
              <p className="m-0 text-[15px] text-[var(--tp-fg-4A5A4F)]">{fb.tariffSubtitle}</p>
              <form
                onSubmit={handleRecalculateWithRates}
                className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end"
              >
                <label className="flex flex-col gap-1 text-[14px] font-bold text-[var(--tp-fg-17251C)]">
                  <span>{fb.waterTariffLabel}</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="e.g. 0.25"
                    value={waterTariff}
                    onChange={(e) => setWaterTariff(e.target.value)}
                    className="min-h-[46px] rounded-[12px] border-[1.5px] border-[var(--tp-bd-C9C3B3)] bg-[var(--tp-bg-FFFFFF)] px-3 text-[16px]"
                  />
                </label>
                <label className="flex flex-col gap-1 text-[14px] font-bold text-[var(--tp-fg-17251C)]">
                  <span>{fb.electricityTariffLabel}</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder={analysis.savings.solarCoversPumpElectricity ? "0 (solar)" : "e.g. 0.21"}
                    disabled={analysis.savings.solarCoversPumpElectricity}
                    value={analysis.savings.solarCoversPumpElectricity ? "0" : elecTariff}
                    onChange={(e) => setElecTariff(e.target.value)}
                    className="min-h-[46px] rounded-[12px] border-[1.5px] border-[var(--tp-bd-C9C3B3)] bg-[var(--tp-bg-FFFFFF)] px-3 text-[16px] disabled:opacity-60"
                  />
                </label>
                <button
                  type="submit"
                  disabled={recalculate.isPending}
                  className="min-h-[46px] px-4 rounded-full bg-[var(--tp-bg-2E6B3A)] text-white text-[15px] font-bold hover:bg-[var(--tp-bg-23542D)]"
                >
                  {fb.saveTariffsBtn}
                </button>
              </form>
            </section>
          </div>

          {/* Plain 3-Part Recommendations */}
          <section className="bg-[var(--tp-bg-FFFFFF)] border-[1.5px] border-[var(--tp-bd-E4DFD2)] rounded-[20px] p-5 lg:p-6 flex flex-col gap-4">
            <h2 className="m-0 text-[20px] font-bold text-[var(--tp-fg-17251C)] flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[var(--tp-fg-2E6B3A)]" />
              <span>{fb.adviceTitle}</span>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {analysis.recommendations.map((rec) => {
                const badge = provenanceBadge(rec.provenance, fb);
                const locRec = localizeBrainRecommendation(rec, analysis.savings, lang);
                return (
                  <article
                    key={rec.id}
                    className="rounded-[16px] border-[1.5px] border-[var(--tp-bd-E4DFD2)] bg-[var(--tp-bg-F6F4EE)] p-4 flex flex-col gap-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={cn(
                          "px-2.5 py-0.5 rounded-full text-[12px] font-bold border",
                          badge.cls
                        )}
                      >
                        {badge.label}
                      </span>
                      {locRec.estimatedImpact && (
                        <span className="text-[13px] font-bold text-[var(--tp-fg-2E6B3A)]">
                          {locRec.estimatedImpact}
                        </span>
                      )}
                    </div>
                    <p className="m-0 text-[16px] font-bold text-[var(--tp-fg-17251C)]">
                      {fb.whatIsHappening}: {locRec.whatIsHappening}
                    </p>
                    <p className="m-0 text-[15px] text-[var(--tp-fg-4A5A4F)]">
                      <b>{fb.whyLabel}:</b> {locRec.why}
                    </p>
                    <p className="m-0 text-[15px] font-bold text-[var(--tp-fg-1F4D28)]">
                      {fb.whatToDo}: {locRec.whatToDo}
                    </p>
                  </article>
                );
              })}
            </div>
          </section>

          {/* 7-Day Soil Moisture Forecast Chart */}
          <section className="tp-card bg-[var(--tp-bg-FFFFFF)] border-[1.5px] border-[var(--tp-bd-E4DFD2)] rounded-[20px] p-5 lg:p-6 flex flex-col gap-4">
            <div>
              <h2 className="m-0 text-[20px] font-bold text-[var(--tp-fg-17251C)]">
                {fb.forecastTitle}
              </h2>
              <p className="m-0 text-[15px] text-[var(--tp-fg-4A5A4F)]">{fb.forecastSubtitle}</p>
            </div>
            <div dir="ltr" className="w-full h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={analysis.soilMoistureForecast7d}>
                  <defs>
                    <linearGradient id="fbMoistureGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2E6B3A" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#2E6B3A" stopOpacity={0.03} />
                    </linearGradient>
                    <linearGradient id="fbIrrGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#1D4F91" stopOpacity={0.28} />
                      <stop offset="95%" stopColor="#1D4F91" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(120,120,110,0.2)" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--tp-bg-FFFFFF)",
                      border: "1.5px solid var(--tp-bd-E4DFD2)",
                      borderRadius: "12px",
                      color: "var(--tp-fg-17251C)",
                    }}
                    labelStyle={{ fontWeight: 700, color: "var(--tp-fg-17251C)" }}
                  />
                  <Area
                    type="monotone"
                    dataKey="expectedMoisturePct"
                    name={fb.moistureChartLabel}
                    stroke="#2E6B3A"
                    fill="url(#fbMoistureGrad)"
                    strokeWidth={2.5}
                  />
                  <Area
                    type="monotone"
                    dataKey="recommendedIrrigationMm"
                    name={fb.recommendedWaterLabel}
                    stroke="#1D4F91"
                    fill="url(#fbIrrGrad)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* Plot Breakdown + Data Completeness */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <section className="tp-card bg-[var(--tp-bg-FFFFFF)] border-[1.5px] border-[var(--tp-bd-E4DFD2)] rounded-[20px] p-5 flex flex-col gap-3">
              <h2 className="m-0 text-[19px] font-bold text-[var(--tp-fg-17251C)]">
                {fb.plotsTitle}
              </h2>
              <div className="flex flex-col gap-2.5">
                {analysis.plotBreakdowns.map((plot) => (
                  <div
                    key={plot.plotId}
                    className="rounded-[14px] border border-[var(--tp-bd-E4DFD2)] p-3.5 flex flex-wrap items-center justify-between gap-2"
                  >
                    <div>
                      <b className="text-[17px] text-[var(--tp-fg-17251C)] block">
                        {cropLabel(plot.cropName, plot.cropCode)}{" "}
                        <span dir="ltr" style={{ unicodeBidi: "isolate" }} className="inline-block">
                          ({Number(plot.areaHa.toFixed(1))} ha)
                        </span>
                      </b>
                      <span className="text-[14px] text-[var(--tp-fg-4A5A4F)]">
                        {fb.withoutSmartLabel}:{" "}
                        <span dir="ltr" style={{ unicodeBidi: "isolate" }} className="inline-block tp-tabular">
                          {plot.baselineWaterM3Yr.toLocaleString()} m³
                        </span>{" "}
                        → {fb.withSmartLabel}:{" "}
                        <span dir="ltr" style={{ unicodeBidi: "isolate" }} className="inline-block tp-tabular">
                          {plot.smartWaterM3Yr.toLocaleString()} m³
                        </span>
                      </span>
                    </div>
                    <span
                      dir="ltr"
                      style={{ unicodeBidi: "isolate" }}
                      className="tp-tabular px-3 py-1 rounded-full bg-[var(--tp-bg-E3EFE2)] text-[var(--tp-fg-1F4D28)] text-[14px] font-bold"
                    >
                      -{plot.waterSavedM3Yr.toLocaleString()} m³ ({plot.efficiencyGainPct}%)
                    </span>
                  </div>
                ))}
              </div>
            </section>

            <section className="tp-card bg-[var(--tp-bg-FFFFFF)] border-[1.5px] border-[var(--tp-bd-E4DFD2)] rounded-[20px] p-5 flex flex-col gap-3">
              <div className="flex items-center justify-between gap-2">
                <h2 className="m-0 text-[19px] font-bold text-[var(--tp-fg-17251C)] flex items-center gap-2">
                  <Gauge className="w-5 h-5 text-[var(--tp-fg-2E6B3A)]" />
                  <span>{fb.completenessTitle}</span>
                </h2>
                <span className="tp-tabular text-[20px] font-bold text-[var(--tp-fg-2E6B3A)]">
                  {analysis.dataCompletenessPct}%
                </span>
              </div>
              <div className="h-2.5 w-full rounded-full bg-[var(--tp-bg-F6F4EE)] border border-[var(--tp-bd-E4DFD2)] overflow-hidden">
                <div
                  className="h-full rounded-full bg-[var(--tp-bg-2E6B3A)] transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.max(0, analysis.dataCompletenessPct))}%` }}
                />
              </div>
              <p className="m-0 text-[14px] text-[var(--tp-fg-4A5A4F)]">
                {fb.completenessMissingHint}
              </p>
              <div className="flex flex-col gap-2">
                {analysis.completenessItems.map((item) => {
                  const badge = provenanceBadge(item.provenance, fb);
                  return (
                    <div
                      key={item.key}
                      className="flex flex-wrap items-center justify-between gap-2 text-[14px] border-b border-[var(--tp-bd-E4DFD2)] pb-2"
                    >
                      <span className="flex items-center gap-2 min-w-0">
                        <CheckCircle2
                          className={cn(
                            "w-4 h-4 shrink-0",
                            item.present ? "text-[var(--tp-fg-2E6B3A)]" : "text-[var(--tp-fg-C9C3B3)]"
                          )}
                        />
                        <span className="leading-snug font-medium text-[var(--tp-fg-17251C)]">
                          {localizeCompletenessLabel(item.key, item.label, lang)}
                        </span>
                      </span>
                      <span
                        className={cn(
                          "px-2 py-0.5 rounded-full text-[11px] font-bold border shrink-0",
                          badge.cls
                        )}
                      >
                        {badge.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>

          {/* Collapsible For Engineers Section */}
          <details className="bg-[var(--tp-bg-FFFFFF)] border-[1.5px] border-[var(--tp-bd-E4DFD2)] rounded-[20px] p-5">
            <summary className="cursor-pointer list-none flex items-center justify-between gap-2 text-[17px] font-bold text-[var(--tp-fg-1D4F91)]">
              <span className="flex items-center gap-2">
                <Brain className="w-5 h-5" />
                <span>{fb.engineerToggleLabel}</span>
              </span>
              <span className="text-[14px] font-normal text-[var(--tp-fg-4A5A4F)]">
                {fb.engineerSubtitle}
              </span>
            </summary>
            <div className="pt-4 flex flex-col gap-3 text-[14px] text-[var(--tp-fg-4A5A4F)]">
              <b className="text-[var(--tp-fg-17251C)]">{fb.mlModelsHeading}</b>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {analysis.mlModelsUsed.map((m) => (
                  <div
                    key={m.modelName}
                    className="rounded-[12px] bg-[var(--tp-bg-F6F4EE)] p-3 border border-[var(--tp-bd-E4DFD2)]"
                  >
                    <b className="text-[var(--tp-fg-17251C)] block">{m.modelName}</b>
                    <span>{m.algorithm}</span>
                    <div>
                      R²: {m.validationR2 ?? "--"} · MAE: {m.validationMae ?? "--"}
                    </div>
                  </div>
                ))}
              </div>
              <ul className="m-0 ps-5 space-y-1">
                {analysis.assumptions.map((a, idx) => (
                  <li key={idx}>{a}</li>
                ))}
                {analysis.limitations.map((l, idx) => (
                  <li key={`lim_${idx}`}>{l}</li>
                ))}
              </ul>
            </div>
          </details>
        </>
      )}
    </div>
  );
}
