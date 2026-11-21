"use client";

import * as React from "react";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";
import { FarmerPageHeader } from "@/components/farmer/FarmerUI";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import { useFarmAnalysis, useFarms } from "@/hooks/useFarms";
import { selectFarmerMetrics } from "@/lib/services/farmer-metrics";

function facingLabel(azimuthDeg: number, southText: string): string {
  if (Math.abs(azimuthDeg) <= 25) return southText;
  if (azimuthDeg > 25 && azimuthDeg < 135) return "West-facing";
  if (azimuthDeg < -25 && azimuthDeg > -135) return "East-facing";
  return `${azimuthDeg}°`;
}

export default function SolarPage() {
  const { t, fmt, monthLabel } = useLanguage();
  const { activeFarm, isLoading: farmsLoading } = useFarms();
  const { data: analysis, isLoading: analysisLoading } = useFarmAnalysis(activeFarm);

  if (farmsLoading || analysisLoading) {
    return (
      <div className="flex flex-col gap-4">
        <FarmerPageHeader mobileLabel={t.navSunPower} title={t.sunQuestionTitle} />
        <div className="bg-white border-[1.5px] border-[#E4DFD2] rounded-[20px] p-8 flex items-center gap-3 text-[17px] text-[#4A5A4F]">
          <Loader2 className="w-6 h-6 animate-spin text-[#C98A1B]" />
          <span>Checking solar hours for your land…</span>
        </div>
      </div>
    );
  }

  if (!activeFarm) {
    return (
      <div className="flex flex-col gap-4">
        <FarmerPageHeader mobileLabel={t.navSunPower} title={t.sunQuestionTitle} />
        <section className="bg-white border-[1.5px] border-[#E4DFD2] rounded-[20px] p-6 flex flex-col gap-3">
          <p className="m-0 text-[18px] text-[#17251C]">{t.stepAddFarmPrompt}</p>
          <Link
            href="/farms?new=1"
            className="min-h-[48px] px-6 rounded-full bg-[#2E6B3A] text-white font-bold text-[17px] inline-flex items-center w-fit"
          >
            {t.addFarmTitle}
          </Link>
        </section>
      </div>
    );
  }

  const m = selectFarmerMetrics(activeFarm, analysis);
  const localizedWorstMonth = monthLabel(m.worstMonthName);
  const annualRatioPct =
    m.solarAnnualKwh && m.pumpAnnualKwh && m.solarAnnualKwh > 0
      ? Math.min(100, Math.max(8, Math.round((m.pumpAnnualKwh / m.solarAnnualKwh) * 100)))
      : 60;

  return (
    <div className="flex flex-col gap-5">
      <FarmerPageHeader mobileLabel={t.navSunPower} title={t.sunQuestionTitle} />

      {/* Year vs Worst Month Row matching DeskSun.dc.html */}
      <div className="flex flex-col lg:flex-row gap-5 items-stretch">
        {/* Full Year Balance */}
        <section className="flex-[1_1_380px] min-w-0 bg-white border-[1.5px] border-[#E4DFD2] rounded-[20px] lg:rounded-[22px] p-5 lg:px-[26px] lg:py-6 flex flex-col gap-3.5">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-7 h-7 text-[#2E6B3A] shrink-0" strokeWidth={2.4} aria-hidden="true" />
            <p className="m-0 text-[21px] lg:text-[26px] font-bold text-[#17251C]">
              {m.annualSolarCoversPump ? t.yesOverFullYear : t.yesMostOfYear}
            </p>
          </div>

          <p className="m-0 text-[16px] leading-[1.4] text-[#4A5A4F]">
            {fmt(t.withYourPanelsFullYear, {
              kw: m.solarKwp,
              panels: m.solarPanelCount500W,
            })}
          </p>

          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between text-[15px] lg:text-[17px]">
              <span>{t.sunMakes}</span>
              <b>
                {m.solarAnnualKwh !== null ? m.solarAnnualKwh.toLocaleString() : "—"} {t.kwhAYear}
              </b>
            </div>
            <div className="h-[22px] lg:h-[26px] rounded-full bg-[#C98A1B]" />
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between text-[15px] lg:text-[17px]">
              <span>{t.pumpUses}</span>
              <b>
                {m.pumpAnnualKwh !== null ? m.pumpAnnualKwh.toLocaleString() : "—"} {t.kwhAYear}
              </b>
            </div>
            <div className="h-[22px] lg:h-[26px] rounded-full bg-[#F1E7D3] overflow-hidden">
              <div
                className="h-full rounded-full bg-[#5B4A2A]"
                style={{ width: `${annualRatioPct}%` }}
              />
            </div>
          </div>

          <p className="m-0 text-[15px] lg:text-[16px] text-[#4A5A4F]">
            {t.extraWinterPowerNote}
          </p>
        </section>

        {/* Peak / Worst Month 10-Unit Visual Meter */}
        <section
          className={
            m.isSolarShortInSummer
              ? "flex-[1_1_380px] min-w-0 bg-[#FCEFD9] border-2 border-[#E2B66B] rounded-[20px] lg:rounded-[22px] p-5 lg:px-[26px] lg:py-6 flex flex-col gap-3.5"
              : "flex-[1_1_380px] min-w-0 bg-[#E3EFE2] border-2 border-[#7FB083] rounded-[20px] lg:rounded-[22px] p-5 lg:px-[26px] lg:py-6 flex flex-col gap-3.5"
          }
        >
          <div className="flex items-center gap-2.5">
            {m.isSolarShortInSummer ? (
              <AlertTriangle className="w-7 h-7 text-[#8A4B00] shrink-0" strokeWidth={2.2} aria-hidden="true" />
            ) : (
              <CheckCircle2 className="w-7 h-7 text-[#2E6B3A] shrink-0" strokeWidth={2.2} aria-hidden="true" />
            )}
            <p
              className={
                m.isSolarShortInSummer
                  ? "m-0 text-[21px] lg:text-[26px] font-bold text-[#6B3A00]"
                  : "m-0 text-[21px] lg:text-[26px] font-bold text-[#1F4D28]"
              }
            >
              {m.isSolarShortInSummer
                ? fmt(t.notEnoughInMonth, { month: localizedWorstMonth })
                : t.enoughAllYear}
            </p>
          </div>

          <p className="m-0 text-[16px] lg:text-[18px] leading-[1.45] text-[#3B3020]">
            {fmt(t.treesDrinkMostWhenHot, { units: m.solarUnitsOutOf10 })}
          </p>

          <div
            role="img"
            aria-label={`${m.solarUnitsOutOf10} of 10 units covered`}
            className="grid grid-cols-10 gap-1.5"
          >
            {Array.from({ length: 10 }, (_, idx) => {
              const filled = idx < m.solarUnitsOutOf10;
              return (
                <span
                  key={idx}
                  className={
                    filled
                      ? "h-[28px] lg:h-[34px] rounded-[7px] bg-[#C98A1B]"
                      : "h-[28px] lg:h-[34px] rounded-[7px] bg-white border-[1.5px] border-dashed border-[#8A4B00]"
                  }
                />
              );
            })}
          </div>

          {m.worstMonthDeficitKwh > 0 && (
            <p className="m-0 text-[16px] font-bold text-[#3B3020]">
              {fmt(t.missingInMonthKwh, {
                month: localizedWorstMonth,
                kwh: m.worstMonthDeficitKwh.toLocaleString(),
              })}
            </p>
          )}
        </section>
      </div>

      {/* Bottom Row: How to cover summer + Your panels */}
      <div className="flex flex-col lg:flex-row gap-5 items-stretch">
        <section className="flex-[2_1_460px] min-w-0 flex flex-col gap-3">
          <h2 className="m-0 text-[20px] lg:text-[22px] font-bold text-[#17251C]">
            {t.howToCoverSummer}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-white border-[1.5px] border-[#E4DFD2] rounded-[16px] p-4 flex flex-col gap-1.5">
              <b className="text-[17px] lg:text-[18px]">{t.optWaterTank}</b>
              <span className="text-[15px] text-[#4A5A4F] leading-[1.4]">
                {fmt(t.optWaterTankDesc, {
                  m3: m.recommendedTankM3 ?? 200,
                })}
              </span>
              <span className="mt-auto pt-1 text-[14px] font-bold text-[#1F4D28]">
                {t.usuallyCheapest}
              </span>
            </div>

            <div className="bg-white border-[1.5px] border-[#E4DFD2] rounded-[16px] p-4 flex flex-col gap-1.5">
              <b className="text-[17px] lg:text-[18px]">{t.optBattery}</b>
              <span className="text-[15px] text-[#4A5A4F] leading-[1.4]">
                {fmt(t.optBatteryDesc, {
                  kwh: m.recommendedBatteryKwh ?? 40,
                })}
              </span>
            </div>

            <div className="bg-white border-[1.5px] border-[#E4DFD2] rounded-[16px] p-4 flex flex-col gap-1.5">
              <b className="text-[17px] lg:text-[18px]">{t.optGridOrGen}</b>
              <span className="text-[15px] text-[#4A5A4F] leading-[1.4]">
                {t.optGridOrGenDesc}
              </span>
            </div>
          </div>
        </section>

        <section className="flex-[1_1_280px] min-w-0 bg-white border-[1.5px] border-[#E4DFD2] rounded-[20px] px-[22px] py-[18px] flex flex-col gap-3">
          <h2 className="m-0 text-[20px] font-bold text-[#17251C]">
            {t.yourPanelsCard}
          </h2>
          <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-[16px]">
            <dt className="text-[#4A5A4F]">{t.panelSizeLabel}</dt>
            <dd className="m-0 font-bold">
              {fmt(t.panelSizeVal, {
                kw: m.solarKwp,
                panels: m.solarPanelCount500W,
              })}
              {activeFarm.solarConfig.isFarmerProvided === false && (
                <span className="ms-2 text-[13px] font-normal text-[#4A5A4F]">
                  ({t.ourEstimateBadge})
                </span>
              )}
            </dd>
            <dt className="text-[#4A5A4F]">{t.facingLabel}</dt>
            <dd className="m-0 font-bold">
              {facingLabel(activeFarm.solarConfig.azimuthDeg, t.facingSouth)}
            </dd>
            <dt className="text-[#4A5A4F]">{t.angleLabel}</dt>
            <dd className="m-0 font-bold">
              {fmt(t.angleGoodArea, { deg: activeFarm.solarConfig.tiltDeg })}
            </dd>
          </dl>
          <Link
            href="/farms?step=3"
            className="mt-auto text-[16px] font-bold text-[#1D4F91] hover:text-[#123766] min-h-[44px] inline-flex items-center"
          >
            {t.changeMyPanels}
          </Link>
        </section>
      </div>

      {/* Collapsed Engineer / PVGIS Details */}
      {analysis && (
        <details className="bg-white border-[1.5px] border-[#E4DFD2] rounded-[18px] px-5 py-1">
          <summary className="min-h-[56px] flex items-center cursor-pointer text-[17px] font-bold text-[#1D4F91]">
            {t.howDoWeKnowTitle}
          </summary>
          <div className="pb-5 pt-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 text-[15px] text-[#22392A]">
            <span>Installed PV capacity: {analysis.solar.capacityKwp} kWp</span>
            <span>PVGIS specific yield: {analysis.solar.specificYieldKwhPerKwp} kWh/kWp/yr</span>
            <span>PVGIS simulation: {analysis.solar.annualKwh.toLocaleString()} kWh/yr</span>
            <span>Annual pump coverage: {analysis.solarVsPump.annualCoveragePct}%</span>
            <span>System losses assumed: {analysis.solar.systemLossPct}%</span>
            <span>Optimal seasonal tilt: {analysis.solar.optimalTiltDeg ?? analysis.solar.tiltDeg}°</span>
            <span>Data source: European Commission JRC PVGIS v5.3</span>
          </div>
        </details>
      )}
    </div>
  );
}
