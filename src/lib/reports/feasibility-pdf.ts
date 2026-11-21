/**
 * Builds the engineer PDF for a farm report, in the farmer's language.
 *
 * Kept out of the page so it can be tested in Node. The page calls `doc.save(...)`.
 *
 * Arabic needs a font with Arabic letters (Amiri, loaded by the page from /fonts) and
 * right-to-left text. jsPDF joins Arabic letters itself, but the table plugin draws text
 * reversed, so for Arabic the table text is drawn by hand with the options that work.
 * Engine text (risk details, data source names) is technical English in every language.
 */
import { jsPDF } from "jspdf";
import autoTable, { type CellHookData } from "jspdf-autotable";
import { localizeCropLabel, type AppLanguage } from "@/lib/i18n/translations";
import type { FeasibilityReportPayload, SoilTextureClass } from "@/types/agri";

export interface PdfStrings {
  title: string;
  score: string;
  created: string;
  summary: string;
  farmAndClimate: string;
  item: string;
  value: string;
  location: string;
  area: string;
  heightAndSlope: string;
  mainCrop: string;
  soil: string;
  rainPerYear: string;
  evaporationPerYear: string;
  soils: Record<SoilTextureClass, string>;
  nearestWater: string;
  noWaterMapped: string;
  notVisited: string;
  waterAndPump: string;
  sunPower: string;
  bestCrops: string;
  crop: string;
  fit: string;
  waterNeed: string;
  fitHigh: string;
  fitModerate: string;
  fitLow: string;
  risksTitle: string;
  severity: string;
  risk: string;
  detail: string;
  severityHigh: string;
  severityModerate: string;
  severityLow: string;
  sourcesTitle: string;
  source: string;
  provider: string;
  kind: string;
  date: string;
  observed: string;
  modeled: string;
  assumption: string;
  // units
  ha: string;
  m: string;
  mmPerYear: string;
  m3PerYear: string;
  m3PerDay: string;
  m3PerHaYear: string;
  kwhPerYear: string;
  slope: string;
  peak: string;
  pump: string;
  head: string;
  overTheYear: string;
  inMonth: string; // {month}
}

const EN: PdfStrings = {
  title: "TerraPulse farm report for your engineer",
  score: "Score",
  created: "Made on",
  summary: "1. Summary",
  farmAndClimate: "Farm and climate",
  item: "Item",
  value: "Value",
  location: "Location",
  area: "Area (perimeter)",
  heightAndSlope: "Height above sea and slope",
  mainCrop: "Main crop",
  soil: "Soil",
  rainPerYear: "Rain",
  evaporationPerYear: "Evaporation (ET0)",
  soils: {
    SANDY: "Sandy",
    SANDY_LOAM: "Sandy loam",
    LOAM: "Loam",
    SILT_LOAM: "Silt loam",
    CLAY_LOAM: "Clay loam",
    CLAY: "Clay",
  },
  nearestWater: "Nearest mapped water",
  noWaterMapped: "None mapped within 10 km",
  notVisited: "not visited, flow not checked",
  waterAndPump: "Water and pump",
  sunPower: "Sun power",
  bestCrops: "Crops for this place",
  crop: "Crop",
  fit: "Fit",
  waterNeed: "Water need",
  fitHigh: "Good",
  fitModerate: "Medium",
  fitLow: "Low",
  risksTitle: "2. Risks (technical notes in English)",
  severity: "Level",
  risk: "Risk",
  detail: "Engineering detail",
  severityHigh: "High",
  severityModerate: "Medium",
  severityLow: "Low",
  sourcesTitle: "Data sources",
  source: "Source",
  provider: "Provider",
  kind: "Type",
  date: "Date",
  observed: "Measured",
  modeled: "Estimated",
  assumption: "Assumption",
  ha: "ha",
  m: "m",
  mmPerYear: "mm/yr",
  m3PerYear: "m³/yr",
  m3PerDay: "m³/day",
  m3PerHaYear: "m³/ha/yr",
  kwhPerYear: "kWh/yr",
  slope: "slope",
  peak: "peak",
  pump: "pump",
  head: "head",
  overTheYear: "over the year",
  inMonth: "in {month}",
};

const FR: PdfStrings = {
  title: "Rapport TerraPulse de la ferme pour votre ingénieur",
  score: "Score",
  created: "Fait le",
  summary: "1. Résumé",
  farmAndClimate: "Ferme et climat",
  item: "Élément",
  value: "Valeur",
  location: "Position",
  area: "Surface (périmètre)",
  heightAndSlope: "Altitude et pente",
  mainCrop: "Culture principale",
  soil: "Sol",
  rainPerYear: "Pluie",
  evaporationPerYear: "Évaporation (ET0)",
  soils: {
    SANDY: "Sableux",
    SANDY_LOAM: "Sablo-limoneux",
    LOAM: "Limoneux",
    SILT_LOAM: "Limon fin",
    CLAY_LOAM: "Argilo-limoneux",
    CLAY: "Argileux",
  },
  nearestWater: "Eau la plus proche sur la carte",
  noWaterMapped: "Aucune à moins de 10 km",
  notVisited: "non visité, débit non vérifié",
  waterAndPump: "Eau et pompe",
  sunPower: "Énergie solaire",
  bestCrops: "Cultures pour cet endroit",
  crop: "Culture",
  fit: "Adaptation",
  waterNeed: "Besoin en eau",
  fitHigh: "Bonne",
  fitModerate: "Moyenne",
  fitLow: "Faible",
  risksTitle: "2. Risques (notes techniques en anglais)",
  severity: "Niveau",
  risk: "Risque",
  detail: "Détail technique",
  severityHigh: "Élevé",
  severityModerate: "Moyen",
  severityLow: "Faible",
  sourcesTitle: "Sources des données",
  source: "Source",
  provider: "Fournisseur",
  kind: "Type",
  date: "Date",
  observed: "Mesuré",
  modeled: "Estimé",
  assumption: "Hypothèse",
  ha: "ha",
  m: "m",
  mmPerYear: "mm/an",
  m3PerYear: "m³/an",
  m3PerDay: "m³/jour",
  m3PerHaYear: "m³/ha/an",
  kwhPerYear: "kWh/an",
  slope: "pente",
  peak: "pointe",
  pump: "pompe",
  head: "HMT",
  overTheYear: "sur l'année",
  inMonth: "en {month}",
};

const AR: PdfStrings = {
  title: "تقرير TerraPulse عن المزرعة لمهندسك",
  score: "النتيجة",
  created: "تاريخ الإعداد",
  summary: "1. الملخص",
  farmAndClimate: "المزرعة والمناخ",
  item: "البند",
  value: "القيمة",
  location: "الموقع",
  area: "المساحة (المحيط)",
  heightAndSlope: "الارتفاع والانحدار",
  mainCrop: "المحصول الرئيسي",
  soil: "التربة",
  rainPerYear: "المطر",
  evaporationPerYear: "التبخر (ET0)",
  soils: {
    SANDY: "رملية",
    SANDY_LOAM: "رملية طميية",
    LOAM: "طميية",
    SILT_LOAM: "طميية غرينية",
    CLAY_LOAM: "طينية طميية",
    CLAY: "طينية",
  },
  nearestWater: "أقرب ماء على الخريطة",
  noWaterMapped: "لا شيء في حدود 10 كم",
  notVisited: "لم تتم زيارته، التدفق غير مؤكد",
  waterAndPump: "الماء والمضخة",
  sunPower: "طاقة الشمس",
  bestCrops: "محاصيل مناسبة لهذا المكان",
  crop: "المحصول",
  fit: "الملاءمة",
  waterNeed: "حاجة الماء",
  fitHigh: "جيدة",
  fitModerate: "متوسطة",
  fitLow: "ضعيفة",
  risksTitle: "2. المخاطر (ملاحظات تقنية بالإنجليزية)",
  severity: "المستوى",
  risk: "الخطر",
  detail: "التفاصيل التقنية",
  severityHigh: "مرتفع",
  severityModerate: "متوسط",
  severityLow: "منخفض",
  sourcesTitle: "مصادر البيانات",
  source: "المصدر",
  provider: "الجهة",
  kind: "النوع",
  date: "التاريخ",
  observed: "مقاس",
  modeled: "تقديري",
  assumption: "افتراض",
  ha: "هكتار",
  m: "م",
  mmPerYear: "مم في السنة",
  m3PerYear: "م³ في السنة",
  m3PerDay: "م³ في اليوم",
  m3PerHaYear: "م³ للهكتار في السنة",
  kwhPerYear: "كيلوواط ساعة في السنة",
  slope: "انحدار",
  peak: "الذروة",
  pump: "المضخة",
  head: "الارتفاع المانومتري",
  overTheYear: "على مدار السنة",
  inMonth: "في {month}",
};

export const PDF_STRINGS: Record<AppLanguage, PdfStrings> = { en: EN, fr: FR, ar: AR };

export interface FeasibilityPdfOptions {
  lang: AppLanguage;
  /** Plain-language summary lines for the farmer's language (verdict + detail). */
  summaryLines: string[];
  /** Localized peak / worst month names, e.g. "جويلية". */
  worstMonthLabel: string;
  /** Crop name in the farmer's language (the report stores the engine's English name). */
  primaryCropLabel?: string;
  /** Base64 of Amiri-Regular.ttf; required for Arabic. Without it the PDF falls back to English. */
  arabicFontBase64?: string | null;
}

const ARABIC_RE = /[؀-ۿ]/;
// The combination that orders mixed Arabic / numbers / Latin correctly in jsPDF.
const RTL_TEXT_OPTIONS = { isInputVisual: false, isInputRtl: true, isOutputVisual: true } as const;

/** Characters the PDF fonts cannot print are replaced (ET₀ → ET0). */
const clean = (text: string) => text.replace(/₀/g, "0");

/**
 * jsPDF does not mirror brackets in right-to-left text, so "(x)" would print as ")x(".
 * Swapping them before drawing gives the right look.
 */
const mirrorBrackets = (text: string) =>
  text.replace(/[()[\]]/g, (c) => ({ "(": ")", ")": "(", "[": "]", "]": "[" })[c] ?? c);

function drawRtlAware(doc: jsPDF, text: string, x: number, y: number, align: "left" | "right" | "center") {
  const value = clean(text);
  if (ARABIC_RE.test(value)) doc.text(mirrorBrackets(value), x, y, { align, ...RTL_TEXT_OPTIONS });
  else doc.text(value, x, y, { align });
}

/** Numbers in the PDF always use Western digits and plain separators the fonts can print. */
const num = (n: number, digits = 0) =>
  n.toLocaleString("en-US", { maximumFractionDigits: digits, minimumFractionDigits: 0 });

const fill = (tpl: string, vars: Record<string, string | number>) =>
  tpl.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? ""));

function formatDate(iso: string, lang: AppLanguage): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  // Numeric dates print in every font and every language.
  const pad = (v: number) => String(v).padStart(2, "0");
  return lang === "en"
    ? `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
    : `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

/** Safe file name; Arabic or other non-Latin farm names fall back to the farm id. */
export function feasibilityPdfFileName(report: FeasibilityReportPayload): string {
  const latin = report.farmName.replace(/[^a-z0-9]+/gi, "_").replace(/^_+|_+$/g, "");
  const base = latin.length >= 3 ? latin : report.farmId.replace(/[^a-z0-9]+/gi, "_");
  return `TerraPulse_Report_${base}.pdf`;
}

export function buildFeasibilityPdf(
  report: FeasibilityReportPayload,
  options: FeasibilityPdfOptions
): jsPDF {
  // Arabic without its font would print boxes: fall back to English instead.
  const lang: AppLanguage = options.lang === "ar" && !options.arabicFontBase64 ? "en" : options.lang;
  const rtl = lang === "ar";
  const t = PDF_STRINGS[lang];
  const doc = new jsPDF({ unit: "mm", format: "a4" });

  if (rtl && options.arabicFontBase64) {
    doc.addFileToVFS("Amiri-Regular.ttf", options.arabicFontBase64);
    doc.addFont("Amiri-Regular.ttf", "Amiri", "normal");
    // Table headers ask for bold; map it to the same file so no Latin-only font is used.
    doc.addFont("Amiri-Regular.ttf", "Amiri", "bold");
  }
  const font = rtl ? "Amiri" : "helvetica";
  doc.setFont(font, "normal");

  const pageW = doc.internal.pageSize.getWidth();
  const margin = 14;
  const startX = rtl ? pageW - margin : margin;
  const align: "left" | "right" = rtl ? "right" : "left";

  /** Writes one line; Arabic lines get the right-to-left options. */
  const line = (text: string, x: number, y: number, a: "left" | "right" | "center" = align) => {
    if (rtl) drawRtlAware(doc, text, x, y, a);
    else doc.text(clean(text), x, y, { align: a });
  };
  const paragraph = (text: string, y: number, width = pageW - margin * 2, lineH = 5.2): number => {
    const parts = doc.splitTextToSize(clean(text), width) as string[];
    parts.forEach((p, i) => line(p, startX, y + i * lineH));
    return y + parts.length * lineH;
  };

  // Header band
  doc.setFillColor(46, 107, 58);
  doc.rect(0, 0, pageW, 28, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(rtl ? 16 : 15);
  line(t.title, startX, 12);
  doc.setFontSize(10);
  line(
    `${report.farmName} · ${t.score} ${report.overallScore}/100 · ${t.created} ${formatDate(report.createdAt, lang)}`,
    startX,
    21
  );

  // Summary
  doc.setTextColor(23, 37, 28);
  doc.setFontSize(13);
  line(t.summary, startX, 38);
  doc.setFontSize(10.5);
  let y = 45;
  // English keeps the engine's own summary (it already starts with the verdict);
  // other languages use the farmer-language lines from the page.
  const summary = lang === "en" ? [report.executiveSummary] : options.summaryLines;
  for (const s of summary) y = paragraph(s, y) + 1.5;

  // Tables: autoTable lays out; for Arabic we draw the cell text ourselves.
  const rtlHooks = rtl
    ? {
        willDrawCell: (data: CellHookData) => {
          (data.cell as unknown as { _lines?: string[] })._lines = data.cell.text;
          data.cell.text = [];
        },
        didDrawCell: (data: CellHookData) => {
          const lines = (data.cell as unknown as { _lines?: string[] })._lines ?? [];
          const fontSize = data.cell.styles.fontSize;
          const lineH = (fontSize * doc.getLineHeightFactor()) / doc.internal.scaleFactor;
          const x = data.cell.x + data.cell.width - data.cell.padding("right");
          const top = data.cell.y + data.cell.padding("top");
          const tc = data.cell.styles.textColor;
          doc.setFont("Amiri", "normal");
          doc.setFontSize(fontSize);
          if (Array.isArray(tc)) doc.setTextColor(tc[0], tc[1], tc[2]);
          else if (typeof tc === "number") doc.setTextColor(tc);
          lines.forEach((l, i) => drawRtlAware(doc, l, x, top + i * lineH + lineH * 0.8, "right"));
        },
      }
    : {};
  const tableBase = {
    margin: { left: margin, right: margin },
    styles: { font, fontSize: 9, cellPadding: 2.4, halign: align, textColor: [23, 37, 28] as [number, number, number] },
    headStyles: { font, fontStyle: "normal" as const, textColor: [255, 255, 255] as [number, number, number] },
    ...rtlHooks,
  };
  // Arabic tables read right to left: first column on the right.
  const row = (cells: string[]) => {
    const cleaned = cells.map(clean);
    return rtl ? cleaned.reverse() : cleaned;
  };
  const lastY = (fallback: number) =>
    (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? fallback;

  const p = report.propertyOverview;
  const w = report.weatherSummary;
  const ws = report.waterSummary;
  const ip = report.irrigationAndPumpSummary;
  const sol = report.solarSummary;

  autoTable(doc, {
    ...tableBase,
    startY: y + 3,
    head: [row([t.farmAndClimate, t.value])],
    body: [
      [t.location, `${p.coordinates.latitude.toFixed(5)}°, ${p.coordinates.longitude.toFixed(5)}°`],
      [t.area, `${num(p.areaHectares, 2)} ${t.ha} (${num(p.perimeterMeters)} ${t.m})`],
      [t.heightAndSlope, `${num(p.elevationM)} ${t.m} · ${t.slope} ${num(p.slopePct, 1)}%`],
      [t.mainCrop, options.primaryCropLabel ?? p.primaryCrop],
      [t.soil, t.soils[p.soilTexture] ?? p.soilTexture],
      [t.rainPerYear, `${num(w.annualPrecipMm)} ${t.mmPerYear}`],
      [t.evaporationPerYear, `${num(w.annualEt0Mm)} ${t.mmPerYear}`],
      [
        t.nearestWater,
        ws.nearestSourceName
          ? `${ws.nearestSourceName} · ${num(ws.nearestDistanceM ?? 0)} ${t.m} · ${t.notVisited}`
          : t.noWaterMapped,
      ],
      [
        t.waterAndPump,
        `${num(ip.annualGrossWaterM3)} ${t.m3PerYear} · ${t.peak} ${num(ip.peakDailyWaterM3)} ${t.m3PerDay} · ${t.pump} ${num(ip.electricalPowerKw, 1)} kW · ${t.head} ${num(ip.totalDynamicHeadM, 1)} ${t.m}`,
      ],
      [
        t.sunPower,
        `${num(sol.capacityKwp, 1)} kWp · ${num(sol.annualSolarKwh)} ${t.kwhPerYear} · ${num(sol.annualCoveragePct)}% ${t.overTheYear} · ${num(sol.worstMonthCoveragePct)}% ${fill(t.inMonth, { month: options.worstMonthLabel })}`,
      ],
    ].map(row),
    headStyles: { ...tableBase.headStyles, fillColor: [46, 107, 58] },
    columnStyles: rtl ? { 1: { cellWidth: 55 } } : { 0: { cellWidth: 55 } },
  });

  if (report.cropSuitability.length > 0) {
    const fitLabel = (r: string) => (r === "HIGH" ? t.fitHigh : r === "MODERATE" ? t.fitModerate : t.fitLow);
    autoTable(doc, {
      ...tableBase,
      startY: lastY(150) + 7,
      head: [row([t.bestCrops, t.fit, `${t.waterNeed} (${t.m3PerHaYear})`])],
      body: report.cropSuitability.map((c) =>
        row([
          localizeCropLabel(c.cropName, c.cropCode, lang),
          `${fitLabel(c.rating)} (${c.score}/100)`,
          num(c.estimatedAnnualIrrigationM3Ha),
        ])
      ),
      headStyles: { ...tableBase.headStyles, fillColor: [29, 79, 145] },
    });
  }

  // Risks and sources on a new page
  doc.addPage();
  doc.setFont(font, "normal");
  doc.setTextColor(23, 37, 28);
  doc.setFontSize(13);
  line(t.risksTitle, startX, 16);

  const sev = (s: string) => (s === "HIGH" ? t.severityHigh : s === "MODERATE" ? t.severityModerate : t.severityLow);
  autoTable(doc, {
    ...tableBase,
    startY: 22,
    head: [row([t.severity, t.risk, t.detail])],
    body:
      report.risks.length > 0
        ? report.risks.map((r) => row([sev(r.severity), r.title, r.detail]))
        : [row(["—", "—", "—"])],
    headStyles: { ...tableBase.headStyles, fillColor: [138, 75, 0] },
    columnStyles: rtl ? { 2: { cellWidth: 22 }, 1: { cellWidth: 45 } } : { 0: { cellWidth: 22 }, 1: { cellWidth: 45 } },
  });

  const kindLabel = (k: string) => (k === "OBSERVED" ? t.observed : k === "MODELED" ? t.modeled : t.assumption);
  autoTable(doc, {
    ...tableBase,
    startY: lastY(90) + 8,
    head: [row([t.sourcesTitle, t.provider, t.kind, t.date])],
    body: report.sources.map((s) =>
      row([s.name, s.provider, kindLabel(s.provenance), formatDate(s.retrievedAt, lang)])
    ),
    headStyles: { ...tableBase.headStyles, fillColor: [46, 107, 58] },
  });

  return doc;
}
