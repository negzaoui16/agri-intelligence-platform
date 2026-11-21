"use client";

import * as React from "react";
import Link from "next/link";
import { Info, Loader2 } from "lucide-react";
import { FarmerPageHeader, NotCheckedYetCard } from "@/components/farmer/FarmerUI";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import { SCREEN_STRINGS } from "@/lib/i18n/screen-strings";
import { useFarmAnalysis, useFarms } from "@/hooks/useFarms";
import { selectFarmerMetrics } from "@/lib/services/farmer-metrics";
import { localizeWaterSource } from "@/lib/i18n/translations";

function formatDist(m: number): string {
  if (m >= 1000) return `${(m / 1000).toFixed(1)} km`;
  return `${Math.round(m)} m`;
}

export default function WaterPage() {
  const { t, fmt, monthLabel, lang } = useLanguage();
  const s = SCREEN_STRINGS[lang];
  const { activeFarm, isLoading: farmsLoading } = useFarms();
  const { data: analysis, isLoading: analysisLoading } = useFarmAnalysis(activeFarm);

  if (farmsLoading || analysisLoading) {
    return (
      <div className="flex flex-col gap-4">
        <FarmerPageHeader mobileLabel={t.navWater} title={t.waterQuestionTitle} />
        <div className="bg-[var(--tp-bg-FFFFFF)] border-[1.5px] border-[var(--tp-bd-E4DFD2)] rounded-[20px] p-8 flex items-center gap-3 text-[17px] text-[var(--tp-fg-4A5A4F)]">
          <Loader2 className="w-6 h-6 animate-spin text-[var(--tp-fg-1D4F91)]" />
          <span>{s.checkingFarm}</span>
        </div>
      </div>
    );
  }

  if (!activeFarm) {
    return (
      <div className="flex flex-col gap-4">
        <FarmerPageHeader mobileLabel={t.navWater} title={t.waterQuestionTitle} />
        <section className="bg-[var(--tp-bg-FFFFFF)] border-[1.5px] border-[var(--tp-bd-E4DFD2)] rounded-[20px] p-6 flex flex-col gap-3">
          <p className="m-0 text-[18px] text-[var(--tp-fg-17251C)]">{t.stepAddFarmPrompt}</p>
          <Link
            href="/farms?new=1"
            className="min-h-[48px] px-6 rounded-full bg-[var(--tp-bg-2E6B3A)] text-white font-bold text-[17px] inline-flex items-center w-fit"
          >
            {t.addFarmTitle}
          </Link>
        </section>
      </div>
    );
  }

  const m = selectFarmerMetrics(activeFarm, analysis);

  if (!m.hasAnalysis) {
    return (
      <div className="flex flex-col gap-5">
        <FarmerPageHeader mobileLabel={t.navWater} title={t.waterQuestionTitle} />
        <NotCheckedYetCard farmId={activeFarm.id} />
      </div>
    );
  }

  const localizedPeak = monthLabel(m.peakMonthName ?? "");
  const demandBarPct = m.waterCoveragePct ?? 100;

  return (
    <div className="flex flex-col gap-5">
      <FarmerPageHeader mobileLabel={t.navWater} title={t.waterQuestionTitle} />

      {/* Top Answer + "What can you do?" row matching DeskWater.dc.html */}
      <div className="flex flex-col lg:flex-row gap-5 items-stretch">
        <section
          className={
            m.isWaterShort
              ? "lg:flex-[3_1_440px] min-w-0 bg-[var(--tp-bg-FCEFD9)] border-2 border-[var(--tp-bd-E2B66B)] rounded-[20px] lg:rounded-[22px] p-5 lg:px-[26px] lg:py-6 flex flex-col gap-3.5"
              : "lg:flex-[3_1_440px] min-w-0 bg-[var(--tp-bg-E3EFE2)] border-2 border-[var(--tp-bd-7FB083)] rounded-[20px] lg:rounded-[22px] p-5 lg:px-[26px] lg:py-6 flex flex-col gap-3.5"
          }
        >
          <p
            className={
              m.isWaterShort
                ? "m-0 text-[24px] lg:text-[30px] font-bold text-[var(--tp-fg-6B3A00)]"
                : "m-0 text-[24px] lg:text-[30px] font-bold text-[var(--tp-fg-1F4D28)]"
            }
          >
            {m.isWaterShort
              ? fmt(t.notInMonth, { month: localizedPeak })
              : fmt(t.yesEnoughWater, { month: localizedPeak })}
          </p>

          <p className="m-0 text-[17px] lg:text-[18px] leading-[1.45] text-[var(--tp-fg-3B3020)]">
            {fmt(t.hottestMonthSubtitle, { month: localizedPeak })}
          </p>

          {m.peakDailyDemandM3 !== null && (
            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-baseline text-[16px] lg:text-[17px] gap-2">
                <span>{t.yourTreesNeed}</span>
                <b>
                  {m.peakDailyDemandM3} {t.m3ADay}
                </b>
              </div>
              <div className="h-[24px] lg:h-[28px] rounded-full bg-[var(--tp-bg-1D4F91)]" />
            </div>
          )}

          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-baseline text-[16px] lg:text-[17px] gap-2">
              <span>
                {fmt(t.pumpDetailFormula, {
                  flow: m.pumpFlowM3Hr,
                  hours: m.pumpHoursDay,
                })}
              </span>
              <b>
                {m.pumpDailySupplyM3} {t.m3ADay}
              </b>
            </div>
            <div className="h-[24px] lg:h-[28px] rounded-full bg-[var(--tp-bg-FFFFFF)] border-[1.5px] border-[var(--tp-bd-E2B66B)] overflow-hidden">
              <div
                className="h-full bg-[var(--tp-bg-6F9BD1)]"
                style={{ width: `${Math.max(5, Math.min(100, demandBarPct))}%` }}
              />
            </div>
          </div>

          {m.isWaterShort && (
            <p className="m-0 text-[16px] lg:text-[17px] text-[var(--tp-fg-3B3020)]">
              {fmt(t.cupsOfTreesNeed, { cups: m.cupsDenominator })}
            </p>
          )}
        </section>

        {/* What can you do? — always visible when short, helpful tips otherwise */}
        <section className="lg:flex-[2_1_320px] min-w-0 flex flex-col gap-3">
          <h2 className="m-0 text-[20px] lg:text-[22px] font-bold text-[var(--tp-fg-17251C)]">
            {t.whatCanYouDo}
          </h2>

          <Link
            href="/farms?step=3"
            className="bg-[var(--tp-bg-FFFFFF)] border-[1.5px] border-[var(--tp-bd-E4DFD2)] rounded-[16px] px-[18px] py-4 no-underline text-[var(--tp-fg-17251C)] flex gap-3 items-start hover:border-[var(--tp-bd-1D4F91)]/50 transition-colors"
          >
            <span className="shrink-0 w-[34px] h-[34px] rounded-full bg-[var(--tp-bg-E6EEF9)] text-[var(--tp-fg-1D4F91)] font-bold flex items-center justify-center">
              1
            </span>
            <span className="flex flex-col gap-1">
              <b className="text-[17px] lg:text-[18px]">{t.optBiggerPump}</b>
              <span className="text-[15px] lg:text-[16px] text-[var(--tp-fg-4A5A4F)] leading-[1.4]">
                {m.neededPumpFlowM3Hr !== null
                  ? fmt(t.optBiggerPumpDesc, {
                      needed: m.neededPumpFlowM3Hr,
                      current: m.pumpFlowM3Hr,
                    })
                  : `${m.pumpFlowM3Hr} m³ per hour`}
              </span>
            </span>
          </Link>

          <Link
            href="/farms?step=3"
            className="bg-[var(--tp-bg-FFFFFF)] border-[1.5px] border-[var(--tp-bd-E4DFD2)] rounded-[16px] px-[18px] py-4 no-underline text-[var(--tp-fg-17251C)] flex gap-3 items-start hover:border-[var(--tp-bd-1D4F91)]/50 transition-colors"
          >
            <span className="shrink-0 w-[34px] h-[34px] rounded-full bg-[var(--tp-bg-E6EEF9)] text-[var(--tp-fg-1D4F91)] font-bold flex items-center justify-center">
              2
            </span>
            <span className="flex flex-col gap-1">
              <b className="text-[17px] lg:text-[18px]">{t.optPumpLonger}</b>
              <span className="text-[15px] lg:text-[16px] text-[var(--tp-fg-4A5A4F)] leading-[1.4]">
                {m.neededPumpHoursDay !== null
                  ? fmt(t.optPumpLongerDesc, {
                      needed: m.neededPumpHoursDay,
                      current: m.pumpHoursDay,
                      month: localizedPeak,
                    })
                  : `${m.pumpHoursDay} hours a day`}
              </span>
            </span>
          </Link>

          <Link
            href="/assistant"
            className="bg-[var(--tp-bg-FFFFFF)] border-[1.5px] border-[var(--tp-bd-E4DFD2)] rounded-[16px] px-[18px] py-4 no-underline text-[var(--tp-fg-17251C)] flex gap-3 items-start hover:border-[var(--tp-bd-1D4F91)]/50 transition-colors"
          >
            <span className="shrink-0 w-[34px] h-[34px] rounded-full bg-[var(--tp-bg-E6EEF9)] text-[var(--tp-fg-1D4F91)] font-bold flex items-center justify-center">
              3
            </span>
            <span className="flex flex-col gap-1">
              <b className="text-[17px] lg:text-[18px]">{t.optSecondSource}</b>
              <span className="text-[15px] lg:text-[16px] text-[var(--tp-fg-4A5A4F)] leading-[1.4]">
                {m.nearestSourceName && m.nearestSourceDistanceM !== null
                  ? fmt(t.optSecondSourcePhone, {
                      name: localizeWaterSource(
                        m.nearestSourceName,
                        analysis?.waterSources.nearestSource?.sourceType ?? "WATER_INFRASTRUCTURE",
                        lang
                      ).title,
                      dist: formatDist(m.nearestSourceDistanceM),
                    })
                  : t.optSecondSourceDesktop}
              </span>
            </span>
          </Link>
        </section>
      </div>

      {/* Top 3 Mapped Water Sources Table */}
      <section className="bg-[var(--tp-bg-FFFFFF)] border-[1.5px] border-[var(--tp-bd-E4DFD2)] rounded-[20px] lg:rounded-[22px] p-5 lg:px-6 lg:py-[22px] flex flex-col gap-3.5">
        <div className="flex flex-wrap justify-between items-baseline gap-2">
          <h2 className="m-0 text-[20px] lg:text-[22px] font-bold text-[var(--tp-fg-17251C)]">
            {t.waterNearYou}
          </h2>
          {m.sourcesCount > 0 && (
            <span className="text-[15px] text-[var(--tp-fg-4A5A4F)]">
              {fmt(t.showingTopSources, {
                shown: m.topWaterSources.length,
                total: m.sourcesCount,
              })}
            </span>
          )}
        </div>

        {m.topWaterSources.length === 0 ? (
          <p className="m-0 text-[16px] text-[var(--tp-fg-4A5A4F)]">
            {s.noWaterNearby}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[540px] border-collapse text-[16px]">
              <thead>
                <tr className="text-start text-[var(--tp-fg-4A5A4F)] text-[14px]">
                  <th className="py-2 px-2.5 border-b-[1.5px] border-[var(--tp-bd-E4DFD2)] text-start">
                    {t.colPlace}
                  </th>
                  <th className="py-2 px-2.5 border-b-[1.5px] border-[var(--tp-bd-E4DFD2)] text-start">
                    {t.colHowFar}
                  </th>
                  <th className="py-2 px-2.5 border-b-[1.5px] border-[var(--tp-bd-E4DFD2)] text-start">
                    {t.colHowHardToPump}
                  </th>
                  <th className="py-2 px-2.5 border-b-[1.5px] border-[var(--tp-bd-E4DFD2)] text-start">
                    {t.colStatus}
                  </th>
                </tr>
              </thead>
              <tbody>
                {m.topWaterSources.map((src) => {
                  const heightText =
                    src.heightCategory === "SAME"
                      ? t.easySameHeight
                      : src.heightCategory === "HIGHER" && src.heightAbsM !== null
                        ? fmt(t.easyHigher, { m: src.heightAbsM })
                        : src.heightCategory === "LOWER" && src.heightAbsM !== null
                          ? fmt(t.hardLower, { m: src.heightAbsM })
                          : t.heightUnknown;

                  const place = localizeWaterSource(src.name, src.sourceType, lang);

                  return (
                    <tr key={src.id} className="border-b border-[var(--tp-bd-EFEBE1)] last:border-b-0">
                      <td className="py-3 px-2.5">
                        <b>{place.title}</b>
                        <div className="text-[14px] text-[var(--tp-fg-4A5A4F)]">{place.kind}</div>
                      </td>
                      <td className="py-3 px-2.5">
                        {formatDist(src.distanceM)}, {src.cardinalDirection}
                      </td>
                      <td className="py-3 px-2.5">{heightText}</td>
                      <td className="py-3 px-2.5">
                        <span className="inline-block px-2.5 py-1 rounded-[12px] bg-[var(--tp-bg-FCEFD9)] text-[var(--tp-fg-6B3A00)] font-bold text-[14px]">
                          {src.actionType === "ASK_PERMISSION"
                            ? t.askForPermission
                            : t.goAndCheck}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <p className="m-0 flex gap-2.5 items-start text-[15px] leading-[1.45] text-[var(--tp-fg-4A5A4F)]">
          <Info className="w-[22px] h-[22px] shrink-0 mt-0.5 text-[var(--tp-fg-4A5A4F)]" aria-hidden="true" />
          <span>{t.waterCheckWarning}</span>
        </p>
      </section>

      {/* Collapsed Technical / Engineer Details */}
      {analysis && (
        <details className="bg-[var(--tp-bg-FFFFFF)] border-[1.5px] border-[var(--tp-bd-E4DFD2)] rounded-[18px] px-5 py-1">
          <summary className="min-h-[56px] flex items-center cursor-pointer text-[17px] font-bold text-[var(--tp-fg-1D4F91)]">
            {t.forYourEngineerTitle}
          </summary>
          <div className="pb-5 pt-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 text-[15px] text-[var(--tp-fg-22392A)]">
            <span>{s.engTdh}: {analysis.pump.totalDynamicHeadM} m</span>
            <span>
              {s.engStaticHead}: {analysis.pump.staticHeadM} m · {s.engFriction}: {analysis.pump.frictionLossM} m
            </span>
            <span>{s.engElectricalPower}: {analysis.pump.electricalPowerKw} kW</span>
            <span>{s.engDailyEnergy}: {analysis.pump.dailyEnergyKwh} kWh {s.perDay}</span>
            <span>{s.engAnnualEtc}: {analysis.irrigation.annualEtcMm} mm {s.perYear}</span>
            <span>
              {s.engGrossIrrigation}: {analysis.irrigation.annualGrossVolumeM3.toLocaleString()} m³ {s.perYear}
            </span>
            <span>
              {s.engWatershed}: {analysis.waterSources.hydroBasin?.hybasId ?? s.notAvailable}
            </span>
            <span>{s.sources}: OpenStreetMap Overpass, HydroSHEDS, Copernicus DEM</span>
          </div>
        </details>
      )}
    </div>
  );
}
