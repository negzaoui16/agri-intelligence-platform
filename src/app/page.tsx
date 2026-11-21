"use client";

import * as React from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Cloud,
  Droplet,
  Loader2,
  RefreshCw,
  Sun,
} from "lucide-react";
import { ThemeToggle } from "@/components/farmer/FarmerUI";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import { useAuthSession } from "@/hooks/useAuth";
import {
  useFarmAnalysis,
  useFarms,
  useRefreshFarmAnalysis,
} from "@/hooks/useFarms";
import { selectFarmerMetrics } from "@/lib/services/farmer-metrics";
import { localizeWeatherCondition } from "@/lib/i18n/translations";
import { cn } from "@/lib/utils";

export default function HomePage() {
  const { lang, setLang, isRtl, t, fmt, monthLabel, cropLabel } = useLanguage();
  const { farmerProfile, user } = useAuthSession();
  const { farms, activeFarm, isLoading: farmsLoading } = useFarms();
  const {
    data: analysis,
    isLoading: analysisLoading,
  } = useFarmAnalysis(activeFarm);
  const refreshAnalysis = useRefreshFarmAnalysis();

  const [checkedSteps, setCheckedSteps] = React.useState<Record<string, boolean>>({});

  React.useEffect(() => {
    if (!activeFarm) return;
    try {
      const raw = localStorage.getItem(`terrapulse_steps_${activeFarm.id}`);
      if (raw) setCheckedSteps(JSON.parse(raw));
      else setCheckedSteps({});
    } catch {
      setCheckedSteps({});
    }
  }, [activeFarm]);

  const toggleStep = (stepKey: string) => {
    if (!activeFarm) return;
    setCheckedSteps((prev) => {
      const next = { ...prev, [stepKey]: !prev[stepKey] };
      try {
        localStorage.setItem(`terrapulse_steps_${activeFarm.id}`, JSON.stringify(next));
      } catch {
        // ignore storage restrictions
      }
      return next;
    });
  };

  const firstName =
    farmerProfile?.firstName?.trim() ||
    (user && !user.email.includes("demo") ? user.name.split(" ")[0] : "");

  if (farmsLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center gap-3 text-[18px] text-[var(--tp-fg-4A5A4F)]">
        <Loader2 className="w-6 h-6 animate-spin text-[var(--tp-fg-2E6B3A)]" />
        <span>{t.yourFarmToday}…</span>
      </div>
    );
  }

  if (!activeFarm || farms.length === 0) {
    return (
      <div className="max-w-xl mx-auto py-8 flex flex-col gap-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[16px] text-[var(--tp-fg-4A5A4F)] m-0">
              {firstName ? `${t.goodMorning}, ${firstName}` : t.goodMorning}
            </p>
            <h1 className="text-[30px] font-bold text-[var(--tp-fg-17251C)] m-0">
              {t.yourFarmToday}
            </h1>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <ThemeToggle compact />
            <MobileLanguageButton lang={lang} setLang={setLang} label={t.changeLanguageLabel} />
          </div>
        </div>

        <section className="bg-[var(--tp-bg-FFFFFF)] border-[1.5px] border-[var(--tp-bd-E4DFD2)] rounded-[22px] p-6 flex flex-col gap-4">
          <h2 className="text-[22px] font-bold m-0 text-[var(--tp-fg-17251C)]">{t.addFarmTitle}</h2>
          <p className="text-[17px] leading-[1.45] text-[var(--tp-fg-4A5A4F)] m-0">
            {t.stepAddFarmPrompt}
          </p>
          <Link
            href="/farms?new=1"
            className="min-h-[56px] px-7 rounded-full bg-[var(--tp-bg-2E6B3A)] text-white text-[17px] font-bold inline-flex items-center justify-center gap-2 w-fit"
          >
            <span>{t.addFarmTitle}</span>
            <ArrowRight className={cn("w-5 h-5", isRtl && "rotate-180")} aria-hidden="true" />
          </Link>
        </section>
      </div>
    );
  }

  const m = selectFarmerMetrics(activeFarm, analysis);
  const localizedPeakMonth = monthLabel(m.peakMonthName);
  const localizedCrop = cropLabel(m.cropName, m.cropCode);
  const demandBarPct =
    m.peakDailyDemandM3 && m.peakDailyDemandM3 > 0
      ? Math.min(100, Math.max(8, Math.round((m.pumpDailySupplyM3 / m.peakDailyDemandM3) * 100)))
      : 100;

  // Next step checklist items in plain farmer wording
  const nextSteps: Array<{ key: string; text: string }> = [];
  if (m.nearestSourceDistanceM !== null) {
    nextSteps.push({
      key: "visit_water",
      text: fmt(t.stepVisitWaterPoint, { distance: m.nearestSourceDistanceM }),
    });
  }
  if (m.isWaterShort || m.isSolarShortInSummer) {
    nextSteps.push({
      key: "plan_summer",
      text: t.stepPlanSummerWater,
    });
  }
  if (nextSteps.length === 0) {
    nextSteps.push({
      key: "check_report",
      text: t.checkSoilTest,
    });
  }

  const weatherSummaryPlain = localizeWeatherCondition(m.weatherSummary, lang);
  const weatherConditionsLine =
    m.todayPrecipMm < 1 && !m.hasFrostAlert && !m.hasWindAlert
      ? t.noRainNoFrostLightWind
      : [
          m.todayPrecipMm < 1
            ? lang === "ar"
              ? "لا مطر"
              : lang === "fr"
                ? "Pas de pluie"
                : "No rain"
            : `${Math.round(m.todayPrecipMm)} mm`,
          m.hasFrostAlert ? t.frostAlert : t.noFrost,
          m.hasWindAlert
            ? t.windAlert
            : lang === "ar"
              ? "رياح خفيفة"
              : lang === "fr"
                ? "Vent léger"
                : "Light wind",
        ].join(" · ");

  return (
    <div className="flex flex-col gap-4 lg:gap-5">
      {/* Mobile Header matching Main.dc.html / HomeArabic.dc.html */}
      <header className="flex lg:hidden items-center justify-between gap-3">
        <div className="flex flex-col gap-0.5 min-w-0">
          <span className="text-[15px] text-[var(--tp-fg-4A5A4F)]">
            {firstName ? `${t.goodMorning}, ${firstName}` : t.goodMorning}
          </span>
          <span className="text-[22px] font-bold text-[var(--tp-fg-17251C)] truncate">
            {activeFarm.name}
          </span>
          <span className="text-[15px] text-[var(--tp-fg-4A5A4F)] truncate">
            {Number(activeFarm.areaHectares.toFixed(1))} {t.hectaresFull} · {localizedCrop}
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
            <ThemeToggle compact />
            <MobileLanguageButton lang={lang} setLang={setLang} label={t.changeLanguageLabel} />
          </div>
      </header>

      {/* Desktop Header matching DeskHome.dc.html */}
      <header className="hidden lg:flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <span className="text-[17px] text-[var(--tp-fg-4A5A4F)]">
            {firstName ? `${t.goodMorning}, ${firstName}` : t.goodMorning}
          </span>
          <h1 className="m-0 text-[34px] font-bold text-[var(--tp-fg-17251C)] leading-[1.15]">
            {t.yourFarmToday}
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[15px] text-[var(--tp-fg-4A5A4F)]">
            {analysisLoading ? "Checking live weather and sun…" : t.liveDataLabel}
          </span>
          <button
            type="button"
            onClick={() => refreshAnalysis.mutate(activeFarm.id)}
            disabled={refreshAnalysis.isPending}
            aria-label="Refresh farm data"
            className="min-h-[44px] px-4 rounded-full border-[1.5px] border-[var(--tp-bd-C9C3B3)] bg-[var(--tp-bg-FFFFFF)] text-[15px] font-bold text-[var(--tp-fg-17251C)] inline-flex items-center gap-2 hover:bg-[var(--tp-bg-F6F4EE)]"
          >
            <RefreshCw
              className={cn("w-4 h-4", refreshAnalysis.isPending && "animate-spin")}
              aria-hidden="true"
            />
            <span>Refresh</span>
          </button>
        </div>
      </header>

      {/* Top Row: Primary Problem Card + Today Weather Card */}
      <div className="flex flex-col lg:flex-row gap-4 lg:gap-5 items-stretch">
        {m.primaryProblem === "WATER_SHORT" && m.peakDailyDemandM3 !== null ? (
          <section className="lg:flex-[2_1_480px] min-w-0 bg-[var(--tp-bg-FCEFD9)] border-2 border-[var(--tp-bd-E2B66B)] rounded-[20px] lg:rounded-[22px] p-[18px] lg:px-[26px] lg:py-6 flex flex-col gap-3 lg:gap-3.5">
            <div className="flex items-center gap-2.5">
              <AlertTriangle className="w-7 h-7 text-[var(--tp-fg-8A4B00)] shrink-0" strokeWidth={2.2} aria-hidden="true" />
              <span className="text-[15px] font-bold text-[var(--tp-fg-8A4B00)] tracking-[0.03em]">
                {t.needsAttention}
              </span>
            </div>

            <h2 className="m-0 text-[26px] lg:text-[30px] font-bold leading-[1.2] text-[var(--tp-fg-17251C)]">
              {fmt(t.waterWillBeShortInMonth, { month: localizedPeakMonth })}
            </h2>

            {/* Mobile plain comparison sentence */}
            <p className="lg:hidden m-0 text-[17px] leading-[1.45] text-[var(--tp-fg-3B3020)]">
              {fmt(t.yourPumpGivesPerDay, {
                supply: m.pumpDailySupplyM3,
                demand: m.peakDailyDemandM3,
                month: localizedPeakMonth,
              })}
            </p>

            {/* Desktop dual metric comparison bars matching DeskHome.dc.html */}
            <div className="hidden lg:grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <span className="text-[16px] text-[var(--tp-fg-3B3020)]">{t.yourTreesNeed}</span>
                <b className="text-[28px] leading-tight text-[var(--tp-fg-17251C)]">
                  {m.peakDailyDemandM3} <span className="text-[17px] font-normal">{t.m3ADay}</span>
                </b>
                <span className="h-[14px] rounded-[7px] bg-[var(--tp-bg-1D4F91)] block" />
              </div>
              <div className="flex flex-col gap-1.5">
                <span className="text-[16px] text-[var(--tp-fg-3B3020)]">{t.yourPumpGives}</span>
                <b className="text-[28px] leading-tight text-[var(--tp-fg-17251C)]">
                  {m.pumpDailySupplyM3} <span className="text-[17px] font-normal">{t.m3ADay}</span>
                </b>
                <span className="h-[14px] rounded-[7px] bg-[var(--tp-bg-FFFFFF)] border-[1.5px] border-[var(--tp-bd-E2B66B)] overflow-hidden block">
                  <span
                    className="block h-full bg-[var(--tp-bg-6F9BD1)]"
                    style={{ width: `${demandBarPct}%` }}
                  />
                </span>
              </div>
            </div>

            <Link
              href="/water"
              className="self-start min-h-[48px] lg:min-h-[52px] inline-flex items-center gap-2 px-5 lg:px-6 rounded-full bg-[var(--tp-bg-17251C)] text-[var(--tp-on-inverse)] text-[17px] font-bold no-underline mt-1"
            >
              <span>{t.seeWhatToDo}</span>
              <ArrowRight className={cn("w-5 h-5", isRtl && "rotate-180")} strokeWidth={2.4} aria-hidden="true" />
            </Link>
          </section>
        ) : m.primaryProblem === "SOLAR_SHORT" ? (
          <section className="lg:flex-[2_1_480px] min-w-0 bg-[var(--tp-bg-FCEFD9)] border-2 border-[var(--tp-bd-E2B66B)] rounded-[20px] lg:rounded-[22px] p-[18px] lg:px-[26px] lg:py-6 flex flex-col gap-3">
            <div className="flex items-center gap-2.5">
              <AlertTriangle className="w-7 h-7 text-[var(--tp-fg-8A4B00)] shrink-0" strokeWidth={2.2} aria-hidden="true" />
              <span className="text-[15px] font-bold text-[var(--tp-fg-8A4B00)]">{t.needsAttention}</span>
            </div>
            <h2 className="m-0 text-[26px] lg:text-[30px] font-bold leading-[1.2] text-[var(--tp-fg-17251C)]">
              {t.shortInSummer}
            </h2>
            <p className="m-0 text-[17px] leading-[1.45] text-[var(--tp-fg-3B3020)]">
              {fmt(t.treesDrinkMostWhenHot, { units: m.solarUnitsOutOf10 })}
            </p>
            <Link
              href="/solar"
              className="self-start min-h-[48px] px-6 rounded-full bg-[var(--tp-bg-17251C)] text-[var(--tp-on-inverse)] text-[17px] font-bold inline-flex items-center gap-2"
            >
              <span>{t.seeWhatToDo}</span>
              <ArrowRight className={cn("w-5 h-5", isRtl && "rotate-180")} aria-hidden="true" />
            </Link>
          </section>
        ) : (
          <section className="lg:flex-[2_1_480px] min-w-0 bg-[var(--tp-bg-E3EFE2)] border-2 border-[var(--tp-bd-7FB083)] rounded-[20px] lg:rounded-[22px] p-[18px] lg:px-[26px] lg:py-6 flex flex-col gap-3">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-7 h-7 text-[var(--tp-fg-2E6B3A)] shrink-0" strokeWidth={2.2} aria-hidden="true" />
              <span className="text-[15px] font-bold text-[var(--tp-fg-1F4D28)] uppercase">{t.statusAllGood}</span>
            </div>
            <h2 className="m-0 text-[26px] lg:text-[30px] font-bold leading-[1.2] text-[var(--tp-fg-17251C)]">
              {t.waterFineTitle}
            </h2>
            {m.peakDailyDemandM3 !== null && (
              <p className="m-0 text-[17px] leading-[1.45] text-[var(--tp-fg-22392A)]">
                {fmt(t.yourPumpGivesPerDay, {
                  supply: m.pumpDailySupplyM3,
                  demand: m.peakDailyDemandM3,
                  month: localizedPeakMonth,
                })}
              </p>
            )}
            <Link
              href="/reports"
              className="self-start min-h-[48px] px-6 rounded-full bg-[var(--tp-bg-2E6B3A)] text-white text-[17px] font-bold inline-flex items-center gap-2"
            >
              <span>{t.openReport}</span>
              <ArrowRight className={cn("w-5 h-5", isRtl && "rotate-180")} aria-hidden="true" />
            </Link>
          </section>
        )}

        {/* Today Weather Card */}
        <section className="lg:flex-[1_1_280px] min-w-0 bg-[var(--tp-bg-FFFFFF)] border-[1.5px] border-[var(--tp-bd-E4DFD2)] rounded-[20px] lg:rounded-[22px] p-4 lg:px-6 lg:py-[22px] flex flex-col gap-3">
          <h2 className="m-0 text-[19px] lg:text-[20px] font-bold text-[var(--tp-fg-17251C)]">
            {t.todayTitle}
          </h2>
          <div className="flex items-center gap-3.5">
            <Cloud className="hidden lg:block w-12 h-12 text-[var(--tp-fg-2E6B3A)] shrink-0" strokeWidth={1.8} aria-hidden="true" />
            <span className="text-[40px] lg:text-[48px] font-bold leading-none text-[var(--tp-fg-17251C)]">
              {m.currentTempC !== null ? `${m.currentTempC}°` : "—"}
            </span>
            <div className="lg:hidden flex flex-col gap-0.5">
              <span className="text-[17px] text-[var(--tp-fg-17251C)]">{weatherSummaryPlain}</span>
              <span className="text-[15px] text-[var(--tp-fg-4A5A4F)]">{weatherConditionsLine}</span>
            </div>
          </div>
          <span className="hidden lg:block text-[17px] text-[var(--tp-fg-17251C)]">
            {weatherSummaryPlain}
            {m.todayMaxTempC !== null ? `, up to ${m.todayMaxTempC}°` : ""}
          </span>
          <span className="hidden lg:block text-[16px] text-[var(--tp-fg-4A5A4F)]">
            {weatherConditionsLine}
          </span>
          <span className="hidden lg:block mt-auto text-[16px] font-bold text-[var(--tp-fg-1F4D28)]">
            {m.shouldWaterToday ? t.waterAsNormalToday : t.holdWaterRainToday}
          </span>
        </section>
      </div>

      {/* 3 Status Tiles: Water / Sun power / Weather */}
      <div className="grid grid-cols-3 gap-2.5 lg:gap-4">
        <Link
          href="/water"
          className="bg-[var(--tp-bg-FFFFFF)] border-[1.5px] border-[var(--tp-bd-E4DFD2)] rounded-[16px] lg:rounded-[18px] p-3.5 lg:px-5 lg:py-[18px] no-underline text-[var(--tp-fg-17251C)] flex flex-col lg:flex-row gap-1.5 lg:gap-3.5 items-start hover:border-[var(--tp-bd-1D4F91)]/50 transition-colors"
        >
          <Droplet className="w-[30px] h-[30px] lg:w-[34px] lg:h-[34px] text-[var(--tp-fg-1D4F91)] shrink-0" strokeWidth={2} aria-hidden="true" />
          <span className="flex flex-col gap-1 min-w-0">
            <b className="text-[17px] lg:text-[19px] leading-tight">{t.navWater}</b>
            <span
              className={cn(
                "text-[14px] lg:text-[16px] font-bold leading-snug",
                m.waterStatus === "PROBLEM" ? "text-[var(--tp-fg-8A4B00)]" : "text-[var(--tp-fg-2E6B3A)]"
              )}
            >
              {m.isWaterShort
                ? fmt(t.shortInMonth, { month: localizedPeakMonth })
                : t.statusGood}
            </span>
            {m.isWaterShort && (
              <span className="hidden lg:block text-[15px] text-[var(--tp-fg-4A5A4F)]">
                {fmt(t.pumpCupsCaption, { cups: m.cupsDenominator })}
              </span>
            )}
          </span>
        </Link>

        <Link
          href="/solar"
          className="bg-[var(--tp-bg-FFFFFF)] border-[1.5px] border-[var(--tp-bd-E4DFD2)] rounded-[16px] lg:rounded-[18px] p-3.5 lg:px-5 lg:py-[18px] no-underline text-[var(--tp-fg-17251C)] flex flex-col lg:flex-row gap-1.5 lg:gap-3.5 items-start hover:border-[var(--tp-bd-C98A1B)]/60 transition-colors"
        >
          <Sun className="w-[30px] h-[30px] lg:w-[34px] lg:h-[34px] text-[var(--tp-fg-9A6400)] shrink-0" strokeWidth={2} aria-hidden="true" />
          <span className="flex flex-col gap-1 min-w-0">
            <b className="text-[17px] lg:text-[19px] leading-tight">{t.navSunPower}</b>
            <span
              className={cn(
                "text-[14px] lg:text-[16px] font-bold leading-snug",
                m.isSolarShortInSummer ? "text-[var(--tp-fg-8A4B00)]" : "text-[var(--tp-fg-2E6B3A)]"
              )}
            >
              {m.isSolarShortInSummer ? t.shortInSummer : t.enoughAllYear}
            </span>
            <span className="hidden lg:block text-[15px] text-[var(--tp-fg-4A5A4F)]">
              {t.sunRestOfYearCaption}
            </span>
          </span>
        </Link>

        <Link
          href="/environmental"
          className="bg-[var(--tp-bg-FFFFFF)] border-[1.5px] border-[var(--tp-bd-E4DFD2)] rounded-[16px] lg:rounded-[18px] p-3.5 lg:px-5 lg:py-[18px] no-underline text-[var(--tp-fg-17251C)] flex flex-col lg:flex-row gap-1.5 lg:gap-3.5 items-start hover:border-[var(--tp-bd-2E6B3A)]/50 transition-colors"
        >
          <Cloud className="w-[30px] h-[30px] lg:w-[34px] lg:h-[34px] text-[var(--tp-fg-2E6B3A)] shrink-0" strokeWidth={2} aria-hidden="true" />
          <span className="flex flex-col gap-1 min-w-0">
            <b className="text-[17px] lg:text-[19px] leading-tight">{t.navWeather}</b>
            <span
              className={cn(
                "text-[14px] lg:text-[16px] font-bold leading-snug",
                m.hasAnyWeatherAlert ? "text-[var(--tp-fg-8A4B00)]" : "text-[var(--tp-fg-2E6B3A)]"
              )}
            >
              {m.hasAnyWeatherAlert ? t.alertAhead : t.calmWeek}
            </span>
            <span className="hidden lg:block text-[15px] text-[var(--tp-fg-4A5A4F)]">
              {t.weatherCalmCaption}
            </span>
          </span>
        </Link>
      </div>

      {/* Bottom Row: Your next steps + Farm report */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-5">
        <section className="bg-[var(--tp-bg-FFFFFF)] border-[1.5px] border-[var(--tp-bd-E4DFD2)] rounded-[20px] p-4 lg:px-6 lg:py-5 flex flex-col gap-3">
          <h2 className="m-0 text-[19px] lg:text-[20px] font-bold text-[var(--tp-fg-17251C)]">
            {t.yourNextSteps}
          </h2>
          {nextSteps.map((step) => (
            <label
              key={step.key}
              className="flex items-start gap-3 min-h-[44px] text-[17px] leading-[1.4] cursor-pointer text-[var(--tp-fg-17251C)]"
            >
              <input
                type="checkbox"
                checked={Boolean(checkedSteps[step.key])}
                onChange={() => toggleStep(step.key)}
                className="w-6 h-6 mt-0.5 accent-[var(--tp-fg-2E6B3A)] shrink-0 cursor-pointer"
              />
              <span className={cn(checkedSteps[step.key] && "line-through text-[var(--tp-fg-4A5A4F)]")}>
                {step.text}
              </span>
            </label>
          ))}
        </section>

        <section className="bg-[var(--tp-bg-FFFFFF)] border-[1.5px] border-[var(--tp-bd-E4DFD2)] rounded-[20px] p-4 lg:px-6 lg:py-5 flex flex-col gap-3">
          <h2 className="m-0 text-[19px] lg:text-[20px] font-bold text-[var(--tp-fg-17251C)]">
            {t.farmReportCardTitle}
          </h2>
          <p className="m-0 text-[18px] font-bold text-[var(--tp-fg-17251C)]">
            {m.isWaterShort ? t.verdictSolveWaterFirst : t.verdictGoodChoice}
          </p>
          <div className="flex flex-wrap gap-2.5 mt-auto pt-1">
            <Link
              href="/reports"
              className="min-h-[48px] px-5 rounded-full bg-[var(--tp-bg-2E6B3A)] text-white text-[16px] font-bold no-underline inline-flex items-center justify-center"
            >
              {t.openReport}
            </Link>
            <Link
              href="/assistant"
              className="min-h-[48px] px-5 rounded-full border-[1.5px] border-[var(--tp-bd-B8B1A0)] bg-[var(--tp-bg-FFFFFF)] text-[var(--tp-fg-17251C)] text-[16px] font-bold no-underline inline-flex items-center justify-center"
            >
              {t.askAQuestion}
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}

function MobileLanguageButton({
  lang,
  setLang,
  label,
}: {
  lang: "en" | "fr" | "ar";
  setLang: (next: "en" | "fr" | "ar") => void;
  label: string;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className="min-h-[44px] px-2 rounded-full border-[1.5px] border-[var(--tp-bd-C9C3B3)] bg-[var(--tp-bg-FFFFFF)] inline-flex items-center gap-1 text-[15px] font-bold text-[var(--tp-fg-17251C)] shrink-0"
    >
      <button
        type="button"
        onClick={() => setLang("en")}
        className={cn(
          "min-h-[36px] px-2 rounded-full",
          lang === "en" ? "bg-[var(--tp-bg-E3EFE2)] text-[var(--tp-fg-1F4D28)]" : "text-[var(--tp-fg-4A5A4F)]"
        )}
      >
        EN
      </button>
      <span className="text-[var(--tp-fg-C9C3B3)]" aria-hidden="true">·</span>
      <button
        type="button"
        onClick={() => setLang("ar")}
        className={cn(
          "min-h-[36px] px-2 rounded-full",
          lang === "ar" ? "bg-[var(--tp-bg-E3EFE2)] text-[var(--tp-fg-1F4D28)]" : "text-[var(--tp-fg-4A5A4F)]"
        )}
      >
        ع
      </button>
      <span className="text-[var(--tp-fg-C9C3B3)]" aria-hidden="true">·</span>
      <button
        type="button"
        onClick={() => setLang("fr")}
        className={cn(
          "min-h-[36px] px-2 rounded-full",
          lang === "fr" ? "bg-[var(--tp-bg-E3EFE2)] text-[var(--tp-fg-1F4D28)]" : "text-[var(--tp-fg-4A5A4F)]"
        )}
      >
        FR
      </button>
    </div>
  );
}
