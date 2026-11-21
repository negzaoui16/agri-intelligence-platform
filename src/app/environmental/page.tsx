"use client";

import * as React from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { FarmerPageHeader } from "@/components/farmer/FarmerUI";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import { SCREEN_STRINGS, type ScreenStrings } from "@/lib/i18n/screen-strings";
import { localizeWeatherCondition } from "@/lib/i18n/translations";
import { useFarmAnalysis, useFarms } from "@/hooks/useFarms";
import { selectFarmerMetrics } from "@/lib/services/farmer-metrics";
import { cn } from "@/lib/utils";

function formatShortDay(dateStr: string, index: number, todayLabel: string, lang: string): string {
  if (index === 0) return todayLabel;
  const d = new Date(`${dateStr}T12:00:00`);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString(lang === "ar" ? "ar-TN" : lang === "fr" ? "fr-FR" : "en-US", {
    weekday: "short",
  });
}

function plainDayWeather(precipMm: number, et0Mm: number | null, s: ScreenStrings): string {
  if (precipMm >= 5) return s.dayRainExpected;
  if (precipMm >= 1) return s.dayFewDrops;
  if (et0Mm !== null && et0Mm >= 5) return s.daySunnyHot;
  return s.daySunnyNoRain;
}

export default function WeatherPage() {
  const { lang, t, fmt } = useLanguage();
  const s = SCREEN_STRINGS[lang];
  const { activeFarm, isLoading: farmsLoading } = useFarms();
  const { data: analysis, isLoading: analysisLoading } = useFarmAnalysis(activeFarm);

  if (farmsLoading || analysisLoading) {
    return (
      <div className="flex flex-col gap-4">
        <FarmerPageHeader mobileLabel={t.navWeather} title={t.weatherQuestionTitle} />
        <div className="bg-[var(--tp-bg-FFFFFF)] border-[1.5px] border-[var(--tp-bd-E4DFD2)] rounded-[20px] p-8 flex items-center gap-3 text-[17px] text-[var(--tp-fg-4A5A4F)]">
          <Loader2 className="w-6 h-6 animate-spin text-[var(--tp-fg-2E6B3A)]" />
          <span>{s.checkingForecast}</span>
        </div>
      </div>
    );
  }

  if (!activeFarm || !analysis) {
    return (
      <div className="flex flex-col gap-4">
        <FarmerPageHeader mobileLabel={t.navWeather} title={t.weatherQuestionTitle} />
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
  const next4Days = analysis.weather.daily.slice(0, 4);

  return (
    <div className="flex flex-col gap-4 lg:gap-5 max-w-4xl">
      <FarmerPageHeader mobileLabel={t.navWeather} title={t.weatherQuestionTitle} />

      {/* Direct Answer Card matching Weather.dc.html */}
      <section
        className={
          m.shouldWaterToday
            ? "bg-[var(--tp-bg-E3EFE2)] border-2 border-[var(--tp-bd-7FB083)] rounded-[20px] px-5 py-4 lg:px-6 lg:py-5 flex flex-col gap-2"
            : "bg-[var(--tp-bg-E6EEF9)] border-2 border-[var(--tp-bd-94B4DF)] rounded-[20px] px-5 py-4 lg:px-6 lg:py-5 flex flex-col gap-2"
        }
      >
        <p
          className={
            m.shouldWaterToday
              ? "m-0 text-[22px] lg:text-[26px] font-bold text-[var(--tp-fg-1F4D28)]"
              : "m-0 text-[22px] lg:text-[26px] font-bold text-[var(--tp-fg-123766)]"
          }
        >
          {m.shouldWaterToday ? t.yesWaterAsNormal : t.skipRainComing}
        </p>
        <p className="m-0 text-[16px] lg:text-[17px] leading-[1.45] text-[var(--tp-fg-22392A)]">
          {m.shouldWaterToday
            ? fmt(t.soilLosesMmDay, { mm: m.todayEt0Mm })
            : fmt(t.rainComingTodayDetail, { mm: Math.round(m.todayPrecipMm) })}
        </p>
      </section>

      {/* Next 4 Days Forecast */}
      <section className="bg-[var(--tp-bg-FFFFFF)] border-[1.5px] border-[var(--tp-bd-E4DFD2)] rounded-[20px] px-5 py-3 flex flex-col">
        <h2 className="my-2 text-[19px] lg:text-[21px] font-bold text-[var(--tp-fg-17251C)]">
          {t.next4Days}
        </h2>
        {next4Days.map((day, idx) => (
          <div
            key={day.date}
            className="grid grid-cols-[76px_1fr_auto] items-center gap-3 py-3 border-b-[1.5px] border-[var(--tp-bd-EFEBE1)] last:border-b-0"
          >
            <b className="text-[17px] text-[var(--tp-fg-17251C)]">
              {formatShortDay(day.date, idx, t.todayLabel, lang)}
            </b>
            <span className="text-[16px] text-[var(--tp-fg-4A5A4F)]">
              {idx === 0 && m.weatherSummary
                ? `${localizeWeatherCondition(m.weatherSummary, lang)} · ${
                    day.precipMm < 1 ? s.noRain : `${Math.round(day.precipMm)} mm`
                  }`
                : plainDayWeather(day.precipMm, day.et0Mm, s)}
            </span>
            <span className="text-[17px] whitespace-nowrap">
              <b>{Math.round(day.tempMaxC)}°</b> / {Math.round(day.tempMinC)}°
            </span>
          </div>
        ))}
      </section>

      {/* Plain-Word Warnings Card */}
      <section className="bg-[var(--tp-bg-FFFFFF)] border-[1.5px] border-[var(--tp-bd-E4DFD2)] rounded-[20px] p-5 flex flex-col gap-3">
        <h2 className="m-0 text-[19px] lg:text-[21px] font-bold text-[var(--tp-fg-17251C)]">
          {t.warningsTitle}
        </h2>
        <div className="flex flex-wrap gap-2">
          <span
            className={cn(
              "min-h-[36px] px-3.5 rounded-full text-[15px] font-bold inline-flex items-center",
              m.hasFrostAlert
                ? "bg-[var(--tp-bg-FCEFD9)] text-[var(--tp-fg-8A4B00)]"
                : "bg-[var(--tp-bg-E3EFE2)] text-[var(--tp-fg-1F4D28)]"
            )}
          >
            {m.hasFrostAlert ? t.frostAlert : t.noFrost}
          </span>
          <span
            className={cn(
              "min-h-[36px] px-3.5 rounded-full text-[15px] font-bold inline-flex items-center",
              m.hasHeatAlert
                ? "bg-[var(--tp-bg-FCEFD9)] text-[var(--tp-fg-8A4B00)]"
                : "bg-[var(--tp-bg-E3EFE2)] text-[var(--tp-fg-1F4D28)]"
            )}
          >
            {m.hasHeatAlert ? t.heatAlert : t.noHeatWave}
          </span>
          <span
            className={cn(
              "min-h-[36px] px-3.5 rounded-full text-[15px] font-bold inline-flex items-center",
              m.hasWindAlert
                ? "bg-[var(--tp-bg-FCEFD9)] text-[var(--tp-fg-8A4B00)]"
                : "bg-[var(--tp-bg-E3EFE2)] text-[var(--tp-fg-1F4D28)]"
            )}
          >
            {m.hasWindAlert ? t.windAlert : t.noStrongWind}
          </span>
        </div>
        <p className="m-0 text-[15px] text-[var(--tp-fg-4A5A4F)]">{t.alertNoticeHint}</p>
      </section>

      {/* Last Year Plain Rain Note */}
      <p className="m-0 text-[16px] leading-[1.5] text-[var(--tp-fg-4A5A4F)] px-1">
        <b className="text-[var(--tp-fg-17251C)]">{t.lastYearLabel}</b>{" "}
        {fmt(t.lastYearRainSummary, {
          annual: m.annualPrecipMm ?? 0,
          summer: m.summerPrecipMm ?? 0,
        })}
      </p>

      {/* Collapsed Technical Details (WaPOR, ET0, Aridity Index, DEM) */}
      <details className="bg-[var(--tp-bg-FFFFFF)] border-[1.5px] border-[var(--tp-bd-E4DFD2)] rounded-[18px] px-5 py-1">
        <summary className="min-h-[56px] flex items-center cursor-pointer text-[17px] font-bold text-[var(--tp-fg-1D4F91)]">
          {t.forYourEngineerTitle}
        </summary>
        <div className="pb-5 pt-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 text-[15px] text-[var(--tp-fg-22392A)]">
          <span>
            {s.engEt0}: {analysis.climate.annualEt0Mm} mm {s.perYear} (Open-Meteo ERA5)
          </span>
          <span>{s.engAridity}: {analysis.climate.aridityIndex} (UNEP)</span>
          <span>
            {s.engElevation}: {analysis.elevation.farmElevationM} m · {s.engSlope}:{" "}
            {analysis.elevation.estimatedSlopePct}% (Copernicus DEM)
          </span>
          <span>
            {s.engWaporEt}:{" "}
            {analysis.wapor.actualEvapotranspirationMmYr !== null
              ? `${analysis.wapor.actualEvapotranspirationMmYr} mm ${s.perYear}`
              : s.notAvailable}
          </span>
          <span>
            {s.engWaporBiomass}:{" "}
            {analysis.wapor.totalBiomassProductionKgHa !== null
              ? `${analysis.wapor.totalBiomassProductionKgHa} kg/ha ${s.perYear}`
              : s.notAvailable}
          </span>
          <span>{s.sources}: Open-Meteo Forecast & ERA5, FAO WaPOR v3, Copernicus DEM</span>
        </div>
      </details>
    </div>
  );
}
