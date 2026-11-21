import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildFeasibilityPdf,
  feasibilityPdfFileName,
  PDF_STRINGS,
} from "@/lib/reports/feasibility-pdf";
import { buildFeasibilityReport } from "@/lib/services/analysis-orchestrator";
import type { FeasibilityReportPayload } from "@/types/agri";
import { makeDemoFarm, makeMockBundle } from "./fixtures/demo-farm";

const amiriBase64 = readFileSync(path.join(process.cwd(), "public/fonts/Amiri-Regular.ttf")).toString("base64");

function demoReport(): FeasibilityReportPayload {
  return buildFeasibilityReport(makeDemoFarm(), makeMockBundle());
}

/**
 * jsPDF writes Helvetica text as readable strings, so we can look for it in the raw output.
 * Brackets are escaped inside PDF strings; undo that so the checks read naturally.
 */
function rawPdf(doc: ReturnType<typeof buildFeasibilityPdf>): string {
  return doc.output().replace(/\\([()])/g, "$1");
}

describe("Engineer PDF", () => {
  it("builds a two-page English PDF with the farm, crops, risks and sources", () => {
    const report = demoReport();
    const doc = buildFeasibilityPdf(report, {
      lang: "en",
      summaryLines: ["Yes, if you solve summer water first."],
      worstMonthLabel: "July",
    });
    const raw = rawPdf(doc);

    expect(doc.getNumberOfPages()).toBe(2);
    expect(raw.startsWith("%PDF-")).toBe(true);
    expect(raw).toContain(PDF_STRINGS.en.title);
    // English uses the engine's own summary, which starts with the verdict.
    expect(raw).toContain("Yes, if you solve summer water first:");
    expect(raw).toContain("Mitidja Plain Citrus");
    expect(raw).toContain(PDF_STRINGS.en.risksTitle);
    expect(raw).toContain(PDF_STRINGS.en.sourcesTitle);
    // Numbers use plain Western digits with comma thousands.
    expect(raw).toMatch(/\d{1,3},\d{3} m³\/yr|\d{1,3},\d{3} m\\263\/yr/);
  });

  it("uses French labels and leaves out the English engine summary", () => {
    const report = demoReport();
    const doc = buildFeasibilityPdf(report, {
      lang: "fr",
      summaryLines: ["Oui, si vous réglez d'abord l'eau en été."],
      worstMonthLabel: "juillet",
    });
    const raw = rawPdf(doc);

    expect(raw).toContain("Rapport TerraPulse");
    expect(raw).toContain(PDF_STRINGS.fr.farmAndClimate);
    expect(raw).not.toContain(report.executiveSummary.slice(0, 40));
  });

  it("embeds the Arabic font for an Arabic PDF", () => {
    const doc = buildFeasibilityPdf(demoReport(), {
      lang: "ar",
      summaryLines: ["نعم، إذا حللت مشكلة ماء الصيف أولاً."],
      worstMonthLabel: "جويلية",
      arabicFontBase64: amiriBase64,
    });
    const raw = rawPdf(doc);

    expect(doc.getNumberOfPages()).toBe(2);
    expect(raw).toContain("/BaseFont /Amiri");
    expect(doc.getFontList().Amiri).toBeDefined();
  });

  it("falls back to English instead of printing boxes when the Arabic font is missing", () => {
    const doc = buildFeasibilityPdf(demoReport(), {
      lang: "ar",
      summaryLines: ["نعم"],
      worstMonthLabel: "July",
      arabicFontBase64: null,
    });
    const raw = rawPdf(doc);

    expect(raw).not.toContain("/BaseFont /Amiri");
    expect(raw).toContain(PDF_STRINGS.en.title);
  });

  it("still builds when there are no crops, no risks and no mapped water", () => {
    const report: FeasibilityReportPayload = {
      ...demoReport(),
      cropSuitability: [],
      risks: [],
      waterSummary: { ...demoReport().waterSummary, nearestSourceName: null, nearestDistanceM: null },
    };
    for (const lang of ["en", "fr", "ar"] as const) {
      const doc = buildFeasibilityPdf(report, {
        lang,
        summaryLines: [],
        worstMonthLabel: "July",
        arabicFontBase64: lang === "ar" ? amiriBase64 : null,
      });
      expect(doc.getNumberOfPages()).toBe(2);
    }
    const raw = rawPdf(
      buildFeasibilityPdf(report, { lang: "en", summaryLines: [], worstMonthLabel: "July" })
    );
    expect(raw).toContain(PDF_STRINGS.en.noWaterMapped);
  });

  it("makes a safe file name, using the farm id when the name has no Latin letters", () => {
    const report = demoReport();
    expect(feasibilityPdfFileName(report)).toBe("TerraPulse_Report_Mitidja_Plain_Citrus_Market_Estate.pdf");
    expect(feasibilityPdfFileName({ ...report, farmName: "مزرعة الزيتون" })).toBe(
      `TerraPulse_Report_${report.farmId}.pdf`
    );
  });
});
