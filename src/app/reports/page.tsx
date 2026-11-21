"use client";

import * as React from "react";
import Link from "next/link";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { Loader2 } from "lucide-react";
import { FarmerPageHeader, FarmerStatusBadge } from "@/components/farmer/FarmerUI";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import { useFarmAnalysis, useFarms, useReports } from "@/hooks/useFarms";
import { cacheReportsLocally } from "@/lib/offline/sync-engine";
import { selectFarmerMetrics } from "@/lib/services/farmer-metrics";
import { useAppStore } from "@/lib/store/app-store";
import { formatTimestamp } from "@/lib/utils";
import type { FeasibilityReportPayload } from "@/types/agri";
import { useQueryClient } from "@tanstack/react-query";

function exportFeasibilityPdf(report: FeasibilityReportPayload) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });

  doc.setFillColor(46, 107, 58);
  doc.rect(0, 0, 210, 28, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.text("TerraPulse Agri Intelligence — Engineer Feasibility Report", 14, 13);
  doc.setFontSize(10);
  doc.text(
    `${report.farmName} | Score: ${report.overallScore}/100 (${report.verdict}) | Generated ${formatTimestamp(report.createdAt)}`,
    14,
    21
  );

  doc.setTextColor(20, 20, 20);
  doc.setFontSize(12);
  doc.text("1. Executive Summary", 14, 38);
  doc.setFontSize(9.5);
  const splitSummary = doc.splitTextToSize(report.executiveSummary, 182);
  doc.text(splitSummary, 14, 44);

  const yPos = 44 + splitSummary.length * 4.6 + 6;

  autoTable(doc, {
    startY: yPos,
    head: [["Property & Environmental Metric", "Value"]],
    body: [
      [
        "Coordinates",
        `${report.propertyOverview.coordinates.latitude.toFixed(5)}°, ${report.propertyOverview.coordinates.longitude.toFixed(5)}°`,
      ],
      [
        "Area & Perimeter",
        `${report.propertyOverview.areaHectares.toFixed(2)} ha (${Math.round(report.propertyOverview.perimeterMeters)} m)`,
      ],
      [
        "Elevation & Slope",
        `${report.propertyOverview.elevationM} m ASL (${report.propertyOverview.slopePct}% slope)`,
      ],
      [
        "Primary Crop & Soil",
        `${report.propertyOverview.primaryCrop} / ${report.propertyOverview.soilTexture}`,
      ],
      [
        "Climate & Aridity",
        `${report.weatherSummary.annualPrecipMm} mm/yr rain vs ${report.weatherSummary.annualEt0Mm} mm/yr ET0 (${report.weatherSummary.aridityClass}, AI ${report.weatherSummary.aridityIndex})`,
      ],
      [
        "Nearest Mapped Water",
        report.waterSummary.nearestSourceName
          ? `${report.waterSummary.nearestSourceName} (${report.waterSummary.nearestSourceType}) · ${report.waterSummary.nearestDistanceM} m · dZ ${report.waterSummary.elevationDiffM ?? "N/A"} m [UNVERIFIED FLOW]`
          : "None mapped within 10 km",
      ],
      [
        "Irrigation & Pump Load",
        `${report.irrigationAndPumpSummary.annualGrossWaterM3.toLocaleString()} m3/yr · Peak ${report.irrigationAndPumpSummary.peakDailyWaterM3} m3/day · ${report.irrigationAndPumpSummary.electricalPowerKw} kW (${report.irrigationAndPumpSummary.totalDynamicHeadM} m TDH)`,
      ],
      [
        "Solar PVGIS Balance",
        `${report.solarSummary.capacityKwp} kWp -> ${report.solarSummary.annualSolarKwh.toLocaleString()} kWh/yr (${report.solarSummary.annualCoveragePct}% annual; ${report.solarSummary.worstMonthCoveragePct}% in ${report.solarSummary.worstMonthName})`,
      ],
    ],
    styles: { fontSize: 8.5, cellPadding: 2.5 },
    headStyles: { fillColor: [46, 107, 58] },
  });

  const afterMainTable =
    (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 150;

  autoTable(doc, {
    startY: afterMainTable + 8,
    head: [["Crop", "Score", "Rating", "Water Demand (m3/ha/yr)"]],
    body: report.cropSuitability.map((c) => [
      c.cropName,
      `${c.score}/100`,
      c.rating,
      c.estimatedAnnualIrrigationM3Ha.toLocaleString(),
    ]),
    styles: { fontSize: 8.5, cellPadding: 2 },
    headStyles: { fillColor: [29, 79, 145] },
  });

  doc.addPage();
  doc.setFontSize(12);
  doc.text("2. Risks, Recommendations & Data Sources", 14, 16);

  autoTable(doc, {
    startY: 22,
    head: [["Severity", "Risk", "Engineering Detail"]],
    body: report.risks.map((r) => [r.severity, r.title, r.detail]),
    styles: { fontSize: 8, cellPadding: 2.5 },
    headStyles: { fillColor: [138, 75, 0] },
  });

  const afterRisk =
    (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 90;

  autoTable(doc, {
    startY: afterRisk + 8,
    head: [["Data Source", "Provider", "Provenance", "Retrieved"]],
    body: report.sources.map((s) => [
      s.name,
      s.provider,
      s.provenance,
      formatTimestamp(s.retrievedAt),
    ]),
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [46, 107, 58] },
  });

  doc.save(`TerraPulse_Feasibility_${report.farmName.replace(/[^a-z0-9]/gi, "_")}.pdf`);
}

export default function ReportsPage() {
  const queryClient = useQueryClient();
  const { t, monthLabel, cropLabel } = useLanguage();
  const { activeFarm, isLoading: farmsLoading } = useFarms();
  const { data: analysis, isLoading: analysisLoading } = useFarmAnalysis(activeFarm);
  const { data: reports = [], isLoading: reportsLoading } = useReports(activeFarm?.id);
  const isOnline = useAppStore((s) => s.isOnline);
  const [generating, setGenerating] = React.useState(false);
  const [notice, setNotice] = React.useState<string | null>(null);

  const activeReport = reports[0] ?? null;

  const ensureReportAndRun = async (mode: "pdf" | "engineer") => {
    let report = activeReport;
    if (!report && activeFarm && isOnline) {
      setGenerating(true);
      try {
        const res = await fetch("/api/reports", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ farmId: activeFarm.id, refresh: true }),
        });
        if (res.ok) {
          const json = (await res.json()) as { report: FeasibilityReportPayload };
          await cacheReportsLocally([json.report]);
          queryClient.invalidateQueries({ queryKey: ["reports"] });
          report = json.report;
        }
      } finally {
        setGenerating(false);
      }
    }

    if (!report) {
      setNotice("Connect to the internet once to prepare the downloadable PDF for your engineer.");
      return;
    }

    if (mode === "pdf") {
      exportFeasibilityPdf(report);
      setNotice("PDF saved to your device.");
      return;
    }

    // Share or copy technical summary + export PDF
    const summaryText = `TerraPulse Report — ${report.farmName} (${report.overallScore}/100): ${report.executiveSummary}`;
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: `Farm Report — ${report.farmName}`,
          text: summaryText,
        });
        return;
      } catch {
        // user cancelled or unavailable; fall through to PDF + clipboard
      }
    }
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      await navigator.clipboard.writeText(JSON.stringify(report, null, 2)).catch(() => undefined);
    }
    exportFeasibilityPdf(report);
    setNotice("Engineer PDF downloaded and technical summary copied to clipboard.");
  };

  if (farmsLoading || analysisLoading || reportsLoading) {
    return (
      <div className="flex flex-col gap-4">
        <FarmerPageHeader mobileLabel={t.navReport} title={t.reportQuestionTitle} />
        <div className="bg-white border-[1.5px] border-[#E4DFD2] rounded-[20px] p-8 flex items-center gap-3 text-[17px] text-[#4A5A4F]">
          <Loader2 className="w-6 h-6 animate-spin text-[#2E6B3A]" />
          <span>Preparing your farm report…</span>
        </div>
      </div>
    );
  }

  if (!activeFarm) {
    return (
      <div className="flex flex-col gap-4">
        <FarmerPageHeader mobileLabel={t.navReport} title={t.reportQuestionTitle} />
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
  const localizedPeak = monthLabel(m.peakMonthName);
  const localizedCrop = cropLabel(m.cropName, m.cropCode);

  const actionButtons = (
    <>
      <button
        type="button"
        onClick={() => ensureReportAndRun("pdf")}
        disabled={generating}
        className="flex-1 lg:flex-initial min-h-[52px] lg:min-h-[52px] px-5 rounded-full border-[1.5px] border-[#B8B1A0] bg-white text-[16px] font-bold text-[#17251C] hover:bg-[#F6F4EE]"
      >
        {generating ? "…" : t.savePdfBtn}
      </button>
      <button
        type="button"
        onClick={() => ensureReportAndRun("engineer")}
        disabled={generating}
        className="flex-[1.4] lg:flex-initial min-h-[52px] lg:min-h-[52px] px-6 rounded-full bg-[#2E6B3A] text-white text-[16px] font-bold hover:bg-[#23542d]"
      >
        {t.sendToEngineerBtn}
      </button>
    </>
  );

  const topCrops = (analysis?.cropSuitability ?? []).slice(0, 3);

  return (
    <div className="flex flex-col gap-5">
      <FarmerPageHeader
        mobileLabel={t.navReport}
        title={t.reportQuestionTitle}
        subtitle={`${t.navReport} · ${activeFarm.name}`}
        rightAction={actionButtons}
      />

      {notice && (
        <div className="bg-[#E3EFE2] border border-[#7FB083] text-[#1F4D28] rounded-[14px] px-4 py-3 text-[15px] font-bold">
          {notice}
        </div>
      )}

      {/* Dark Verdict Banner matching Report.dc.html / DeskReport.dc.html */}
      <section className="bg-[#17251C] text-white rounded-[20px] lg:rounded-[22px] p-5 lg:px-7 lg:py-6 flex flex-col gap-2">
        <p className="m-0 text-[22px] lg:text-[30px] font-bold leading-[1.25]">
          {m.isWaterShort
            ? "Yes, if you solve summer water first."
            : "Yes, good land for your crops."}
        </p>
        <p className="m-0 text-[16px] lg:text-[18px] leading-[1.45] text-[#D5DDD7]">
          {m.isWaterShort && m.peakDailyDemandM3 !== null
            ? `Good land and climate for ${localizedCrop.toLowerCase()}. Your pump gives ${m.pumpDailySupplyM3} m³ a day, while ${localizedPeak} needs ${m.peakDailyDemandM3} m³ a day.`
            : `Good land and climate for ${localizedCrop.toLowerCase()}. Your water and sun estimates match your farm needs.`}
        </p>
      </section>

      {/* 3 Status Cards (Word + Icon + Color) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5">
        <section className="bg-white border-[1.5px] border-[#E4DFD2] rounded-[18px] p-5 flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <b className="text-[19px]">{t.landAndClimate}</b>
            <FarmerStatusBadge level={m.landStatus} />
          </div>
          <span className="text-[16px] text-[#4A5A4F] leading-[1.45]">
            {m.slopePct !== null && m.slopePct <= 5 ? "Flat land." : "Sloped land."}{" "}
            {m.annualPrecipMm !== null ? `${m.annualPrecipMm} mm of rain a year.` : ""}
          </span>
        </section>

        <section
          className={
            m.waterStatus === "PROBLEM"
              ? "bg-[#FCEFD9] border-2 border-[#E2B66B] rounded-[18px] p-5 flex flex-col gap-2"
              : "bg-white border-[1.5px] border-[#E4DFD2] rounded-[18px] p-5 flex flex-col gap-2"
          }
        >
          <div className="flex items-center justify-between gap-2">
            <b className="text-[19px]">{t.navWater}</b>
            <FarmerStatusBadge level={m.waterStatus} />
          </div>
          <span className="text-[16px] text-[#3B3020] leading-[1.45]">
            {m.isWaterShort && m.peakDailyDemandM3 !== null
              ? `Pump gives ${m.pumpDailySupplyM3} m³ a day. ${localizedPeak} needs ${m.peakDailyDemandM3} m³. `
              : `Pump covers your peak ${localizedPeak} needs. `}
            <Link href="/water" className="font-bold text-[#1D4F91]">
              {m.isWaterShort ? "See fixes" : "See details"}
            </Link>
          </span>
        </section>

        <section className="bg-white border-[1.5px] border-[#E4DFD2] rounded-[18px] p-5 flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <b className="text-[19px]">{t.navSunPower}</b>
            <FarmerStatusBadge level={m.sunStatus} />
          </div>
          <span className="text-[16px] text-[#4A5A4F] leading-[1.45]">
            {m.isSolarShortInSummer
              ? `Enough over the year. Covers ${m.solarUnitsOutOf10} of 10 units in ${monthLabel(m.worstMonthName)}. `
              : "Covers pump energy all year. "}
            <Link href="/solar" className="font-bold text-[#1D4F91]">
              See details
            </Link>
          </span>
        </section>
      </div>

      {/* Best Crops + Check In Person */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-5">
        <section className="bg-white border-[1.5px] border-[#E4DFD2] rounded-[20px] p-5 flex flex-col gap-3">
          <h2 className="m-0 text-[19px] lg:text-[20px] font-bold text-[#17251C]">
            {t.bestCropsForPlace}
          </h2>
          {topCrops.length > 0 ? (
            <ol className="m-0 ps-5 text-[17px] leading-[1.7] text-[#17251C]">
              {topCrops.map((crop) => {
                const isYours = crop.cropCode === activeFarm.irrigationConfig.cropCode;
                return (
                  <li key={crop.cropCode}>
                    <b>{cropLabel(crop.cropName, crop.cropCode)}</b>{" "}
                    {isYours && (
                      <span className="text-[#2E6B3A] font-bold">{t.yourCropTag}</span>
                    )}
                    : {crop.waterDemandNote || crop.thermalMatchNote}
                  </li>
                );
              })}
            </ol>
          ) : (
            <p className="m-0 text-[16px] text-[#4A5A4F]">
              {localizedCrop} is selected for your land.
            </p>
          )}
        </section>

        <section className="bg-white border-[1.5px] border-[#E4DFD2] rounded-[20px] p-5 flex flex-col gap-3">
          <h2 className="m-0 text-[19px] lg:text-[20px] font-bold text-[#17251C]">
            {t.checkInPersonTitle}
          </h2>
          <ul className="m-0 ps-5 text-[16px] lg:text-[17px] leading-[1.65] text-[#22392A]">
            <li>{t.checkPointAllYear}</li>
            <li>{t.checkSoilTest}</li>
            <li>{t.checkGroundwaterDepth}</li>
          </ul>
        </section>
      </div>

      {/* Mobile Action Buttons matching Report.dc.html footer */}
      <div className="flex lg:hidden gap-2.5">{actionButtons}</div>

      {/* Collapsed Engineer Technical Section */}
      {analysis && (
        <details className="bg-white border-[1.5px] border-[#E4DFD2] rounded-[18px] px-5 py-1">
          <summary className="min-h-[56px] flex items-center cursor-pointer text-[17px] font-bold text-[#1D4F91]">
            {t.forYourEngineerTitle}
          </summary>
          <div className="pb-5 pt-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 text-[15px] text-[#22392A]">
            <span>Reference ET₀: {analysis.climate.annualEt0Mm.toLocaleString()} mm/yr (Open-Meteo ERA5)</span>
            <span>
              Gross irrigation: {analysis.irrigation.annualGrossVolumeM3.toLocaleString()} m³/yr (FAO-56,{" "}
              {analysis.irrigation.applicationEfficiencyPct}%)
            </span>
            <span>
              Total dynamic head: {analysis.pump.totalDynamicHeadM} m · {analysis.pump.electricalPowerKw} kW pump
            </span>
            <span>
              PV yield: {analysis.solar.annualKwh.toLocaleString()} kWh/yr, {analysis.solar.capacityKwp} kWp (JRC PVGIS 5.3)
            </span>
            <span>Aridity index: {analysis.climate.aridityIndex} (UNEP)</span>
            <span>
              Elevation {analysis.elevation.farmElevationM} m, slope {analysis.elevation.estimatedSlopePct}% (Copernicus DEM)
            </span>
            {activeReport && <span>Composite score: {activeReport.overallScore}/100 ({activeReport.verdict})</span>}
          </div>
        </details>
      )}
    </div>
  );
}
