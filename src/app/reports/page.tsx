"use client";

import * as React from "react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/primitives";
import { useFarms, useReports } from "@/hooks/useFarms";
import { cacheReportsLocally } from "@/lib/offline/sync-engine";
import { useAppStore } from "@/lib/store/app-store";
import { formatDistance, formatNumber, formatTimestamp } from "@/lib/utils";
import type { FeasibilityReportPayload } from "@/types/agri";
import { useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  Download,
  FileJson,
  FileText,
  Printer,
  Share2,
  Sparkles,
} from "lucide-react";

function exportFeasibilityPdf(report: FeasibilityReportPayload) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });

  doc.setFillColor(20, 83, 45);
  doc.rect(0, 0, 210, 28, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.text("TerraPulse Agri Intelligence — Feasibility Report", 14, 13);
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

  let yPos = 44 + splitSummary.length * 4.6 + 6;

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
          ? `${report.waterSummary.nearestSourceName} (${report.waterSummary.nearestSourceType}) • ${report.waterSummary.nearestDistanceM} m • ΔZ ${report.waterSummary.elevationDiffM ?? "N/A"} m [UNVERIFIED FLOW]`
          : "None mapped within 10 km",
      ],
      [
        "Irrigation & Pump Load",
        `${report.irrigationAndPumpSummary.annualGrossWaterM3.toLocaleString()} m³/yr • Peak ${report.irrigationAndPumpSummary.peakDailyWaterM3} m³/day • ${report.irrigationAndPumpSummary.electricalPowerKw} kW (${report.irrigationAndPumpSummary.totalDynamicHeadM} m TDH)`,
      ],
      [
        "Solar PVGIS Balance",
        `${report.solarSummary.capacityKwp} kWp -> ${report.solarSummary.annualSolarKwh.toLocaleString()} kWh/yr (${report.solarSummary.annualCoveragePct}% annual; ${report.solarSummary.worstMonthCoveragePct}% in ${report.solarSummary.worstMonthName})`,
      ],
    ],
    styles: { fontSize: 8.5, cellPadding: 2.5 },
    headStyles: { fillColor: [20, 83, 45] },
  });

  const afterMainTable =
    (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 150;

  autoTable(doc, {
    startY: afterMainTable + 8,
    head: [["Crop", "Score", "Rating", "Water Demand (m³/ha/yr)"]],
    body: report.cropSuitability.map((c) => [
      c.cropName,
      `${c.score}/100`,
      c.rating,
      c.estimatedAnnualIrrigationM3Ha.toLocaleString(),
    ]),
    styles: { fontSize: 8.5, cellPadding: 2 },
    headStyles: { fillColor: [2, 132, 199] },
  });

  doc.addPage();
  doc.setFontSize(12);
  doc.text("2. Risks, Recommendations & Data Sources", 14, 16);

  autoTable(doc, {
    startY: 22,
    head: [["Severity", "Risk", "Engineering Detail"]],
    body: report.risks.map((r) => [r.severity, r.title, r.detail]),
    styles: { fontSize: 8, cellPadding: 2.5 },
    headStyles: { fillColor: [180, 83, 9] },
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
    headStyles: { fillColor: [20, 83, 45] },
  });

  const afterSources =
    (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 170;
  doc.setFontSize(10);
  doc.text("Key Uncertainties & Field Verification Requirements", 14, afterSources + 10);
  doc.setFontSize(8.5);
  const uncText = doc.splitTextToSize(
    report.uncertainties.map((u) => `• ${u}`).join("\n"),
    182
  );
  doc.text(uncText, 14, afterSources + 16);

  doc.save(`TerraPulse_Feasibility_${report.farmName.replace(/[^a-z0-9]/gi, "_")}.pdf`);
}

export default function ReportsPage() {
  const queryClient = useQueryClient();
  const { activeFarm } = useFarms();
  const { data: reports = [], isLoading } = useReports(activeFarm?.id);
  const isOnline = useAppStore((s) => s.isOnline);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [generating, setGenerating] = React.useState(false);

  const activeReport =
    reports.find((r) => r.id === selectedId) ?? reports[0] ?? null;

  const handleGenerate = async () => {
    if (!activeFarm || !isOnline) return;
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
        setSelectedId(json.report.id);
        queryClient.invalidateQueries({ queryKey: ["reports"] });
      }
    } finally {
      setGenerating(false);
    }
  };

  const handleShare = async () => {
    if (!activeReport) return;
    if (navigator.share) {
      await navigator
        .share({
          title: activeReport.title,
          text: activeReport.executiveSummary,
        })
        .catch(() => undefined);
    } else {
      await navigator.clipboard?.writeText(activeReport.executiveSummary).catch(() => undefined);
    }
  };

  const handleDownloadJson = () => {
    if (!activeReport) return;
    const blob = new Blob([JSON.stringify(activeReport, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${activeReport.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5">
      <div className="no-print flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
            Agricultural Feasibility Reports & PDF Export
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Comprehensive property evaluation citing observed data, modeled simulations, and field uncertainties.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {activeFarm && (
            <Button
              size="sm"
              variant="primary"
              disabled={!isOnline || generating}
              onClick={handleGenerate}
            >
              <Sparkles className="h-3.5 w-3.5" />
              {generating ? "Generating..." : "Generate Report"}
            </Button>
          )}
          {activeReport && (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={() => exportFeasibilityPdf(activeReport)}
              >
                <Download className="h-3.5 w-3.5" />
                Export PDF
              </Button>
              <Button size="sm" variant="outline" onClick={handleDownloadJson}>
                <FileJson className="h-3.5 w-3.5" />
                JSON
              </Button>
              <Button size="sm" variant="outline" onClick={() => window.print()}>
                <Printer className="h-3.5 w-3.5" />
                Print
              </Button>
              <Button size="sm" variant="ghost" onClick={handleShare}>
                <Share2 className="h-3.5 w-3.5" />
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Saved Reports Selector */}
      {reports.length > 1 && (
        <div className="no-print flex gap-2 overflow-x-auto pb-1">
          {reports.map((r) => (
            <button
              key={r.id}
              onClick={() => setSelectedId(r.id)}
              className={`shrink-0 px-3 py-2 rounded-xl border text-xs cursor-pointer ${
                activeReport?.id === r.id
                  ? "bg-[#14532d] text-white border-[#14532d]"
                  : "bg-card border-border"
              }`}
            >
              {r.farmName} • {r.overallScore}/100 ({formatTimestamp(r.createdAt)})
            </button>
          ))}
        </div>
      )}

      {isLoading ? (
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            Loading cached & server feasibility reports...
          </CardContent>
        </Card>
      ) : !activeReport ? (
        <Card>
          <CardContent className="p-10 text-center space-y-3">
            <FileText className="h-10 w-10 mx-auto text-muted-foreground" />
            <p className="font-semibold text-sm">
              No feasibility report generated for {activeFarm?.name ?? "this farm"} yet.
            </p>
            <p className="text-xs text-muted-foreground">
              Click “Generate Report” above to compile weather, water, elevation, FAO-56 irrigation, pump hydraulics, and PVGIS solar estimates into an exportable PDF report.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {/* Executive Header */}
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-lg sm:text-xl">{activeReport.title}</CardTitle>
                  <CardDescription>
                    Generated {formatTimestamp(activeReport.createdAt)} •{" "}
                    {activeReport.propertyOverview.coordinates.latitude.toFixed(5)}°,{" "}
                    {activeReport.propertyOverview.coordinates.longitude.toFixed(5)}°
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    variant={
                      activeReport.overallScore >= 75
                        ? "green"
                        : activeReport.overallScore >= 55
                        ? "amber"
                        : "red"
                    }
                  >
                    Score: {activeReport.overallScore}/100 • {activeReport.verdict}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="text-sm leading-relaxed">
              {activeReport.executiveSummary}
            </CardContent>
          </Card>

          {/* 4 Engineering Pillars */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Property & Terrain</CardDescription>
                <CardTitle className="text-base">
                  {activeReport.propertyOverview.areaHectares.toFixed(2)} ha
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground space-y-1">
                <p>Elevation: {activeReport.propertyOverview.elevationM} m ASL</p>
                <p>Slope: {activeReport.propertyOverview.slopePct}%</p>
                <p>Soil: {activeReport.propertyOverview.soilTexture}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Climate & Aridity</CardDescription>
                <CardTitle className="text-base">{activeReport.weatherSummary.aridityClass}</CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground space-y-1">
                <p>Rain: {activeReport.weatherSummary.annualPrecipMm} mm/yr</p>
                <p>ET₀: {activeReport.weatherSummary.annualEt0Mm} mm/yr</p>
                <p>Aridity Index: {activeReport.weatherSummary.aridityIndex}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Water & Pump Energy</CardDescription>
                <CardTitle className="text-base">
                  {activeReport.irrigationAndPumpSummary.electricalPowerKw} kW Pump
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground space-y-1">
                <p>
                  Nearest:{" "}
                  {activeReport.waterSummary.nearestSourceName
                    ? `${activeReport.waterSummary.nearestSourceName} (${formatDistance(activeReport.waterSummary.nearestDistanceM)})`
                    : "None in 10 km"}
                </p>
                <p>
                  ΔZ: {formatNumber(activeReport.waterSummary.elevationDiffM, 1)} m • TDH{" "}
                  {activeReport.irrigationAndPumpSummary.totalDynamicHeadM} m
                </p>
                <p>
                  Gross Water: {activeReport.irrigationAndPumpSummary.annualGrossWaterM3.toLocaleString()} m³/yr
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription>PVGIS Solar Coverage</CardDescription>
                <CardTitle className="text-base text-amber-600 dark:text-amber-400">
                  {activeReport.solarSummary.annualCoveragePct}% Annual
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground space-y-1">
                <p>
                  {activeReport.solarSummary.capacityKwp} kWp →{" "}
                  {activeReport.solarSummary.annualSolarKwh.toLocaleString()} kWh/yr
                </p>
                <p>
                  Peak {activeReport.solarSummary.worstMonthName}:{" "}
                  {activeReport.solarSummary.worstMonthCoveragePct}%
                </p>
                <p>Buffer: {activeReport.solarSummary.recommendedTankM3} m³ tank</p>
              </CardContent>
            </Card>
          </div>

          {/* Risks & Recommendations */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  Identified Risks & Constraints
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-xs">
                {activeReport.risks.map((risk, idx) => (
                  <div key={idx} className="p-2.5 rounded-lg border border-border">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold">{risk.title}</span>
                      <Badge
                        variant={
                          risk.severity === "HIGH"
                            ? "red"
                            : risk.severity === "MODERATE"
                            ? "amber"
                            : "neutral"
                        }
                      >
                        {risk.severity}
                      </Badge>
                    </div>
                    <p className="text-muted-foreground mt-1">{risk.detail}</p>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Actionable Recommendations & Crop Ranking</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-xs">
                <ul className="space-y-2">
                  {activeReport.recommendations.map((rec, idx) => (
                    <li key={idx} className="p-2 rounded-lg bg-muted">
                      {rec}
                    </li>
                  ))}
                </ul>
                <div className="pt-2 border-t border-border">
                  <p className="font-semibold mb-1.5">Top Climatic Crop Suitability</p>
                  <div className="grid grid-cols-2 gap-2">
                    {activeReport.cropSuitability.slice(0, 4).map((c) => (
                      <div key={c.cropCode} className="p-2 rounded border border-border">
                        <div className="flex justify-between font-medium">
                          <span>{c.cropName}</span>
                          <span>{c.score}/100</span>
                        </div>
                        <span className="text-[10px] text-muted-foreground">
                          {c.estimatedAnnualIrrigationM3Ha.toLocaleString()} m³/ha/yr
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Data Sources & Uncertainties */}
          <Card>
            <CardHeader>
              <CardTitle>Data Sources, Provenance & Key Uncertainties</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-xs">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border text-left text-muted-foreground">
                      <th className="py-1.5 pr-3">Dataset</th>
                      <th className="py-1.5 pr-3">Provider</th>
                      <th className="py-1.5 pr-3">Provenance</th>
                      <th className="py-1.5">Retrieved</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeReport.sources.map((s, idx) => (
                      <tr key={`${s.id}_${idx}`} className="border-b border-border/50">
                        <td className="py-1.5 pr-3 font-medium">{s.name}</td>
                        <td className="py-1.5 pr-3 text-muted-foreground">{s.provider}</td>
                        <td className="py-1.5 pr-3">
                          <Badge variant={s.provenance === "OBSERVED" ? "blue" : "amber"}>
                            {s.provenance}
                          </Badge>
                        </td>
                        <td className="py-1.5 font-mono text-[11px]">
                          {formatTimestamp(s.retrievedAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="space-y-1 text-muted-foreground border-t border-border pt-3">
                <p className="font-semibold text-foreground">Explicit Uncertainties:</p>
                {activeReport.uncertainties.map((u, i) => (
                  <p key={i}>• {u}</p>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
