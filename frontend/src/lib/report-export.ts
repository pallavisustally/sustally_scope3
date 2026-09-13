import { SCOPE3_CATEGORIES } from "@/data/protocol";
import type { InventoryResult } from "@/lib/calculate";
import { DQA_LABELS } from "@/lib/data-quality";
import type { InventoryState } from "@/lib/inventory-types";
import { formatShare, formatTco2e } from "@/lib/numbers";
import { formatReportingYear } from "@/lib/reporting-year";

export type ReportFormat = "pdf" | "xlsx";

export type ReportYearTotal = {
  year: string;
  tco2e: number;
};

export type ReportOptions = {
  preparedBy?: string;
  generatedAt?: string;
  priorYears?: ReportYearTotal[];
};

export type BuiltReport = {
  bytes: Uint8Array;
  mime: string;
  filename: string;
};

export const REPORT_INCLUDES = [
  "Executive summary",
  "Organizational boundary",
  "Category-wise results",
  "Methodology and assumptions",
  "Calculation working",
  "Completeness",
  "Year-over-year comparison",
  "Data sources and emission factors",
  "Exclusions with justification",
  "Data quality assessment",
  "Percent of emissions from supplier data",
  "Biogenic CO₂ (reported separately)",
] as const;

export type ReportInclude = (typeof REPORT_INCLUDES)[number];

const INCLUDE_ALIASES: Record<string, ReportInclude> = {
  "Emission factor by supplier": "Biogenic CO₂ (reported separately)",
};

export const BOUNDARY_COPY: Record<InventoryState["boundary"], { label: string; detail: string }> = {
  operational: {
    label: "Operational control",
    detail: "Account for 100% of emissions from operations the company controls.",
  },
  financial: {
    label: "Financial control",
    detail: "Account for 100% of emissions from operations the company financially controls.",
  },
  equity: {
    label: "Equity share",
    detail: "Account for emissions according to the company's share of equity.",
  },
};

const PAGE_BOTTOM = 792;
const MARGIN_X = 40;
const HEAD_FILL = [142, 77, 255];

type AutoTableFn = (doc: object, options: Record<string, unknown>) => void;

type PdfDoc = {
  lastAutoTable?: { finalY: number };
  internal: { pageSize: { getWidth: () => number } };
  getNumberOfPages: () => number;
  addPage: () => void;
  setPage: (n: number) => void;
  setFont: (font: string, style?: string) => void;
  setFontSize: (size: number) => void;
  setTextColor: (r: number, g?: number, b?: number) => void;
  text: (text: string | string[], x: number, y: number, options?: { align?: "left" | "right" | "center" }) => void;
  splitTextToSize: (text: string, width: number) => string[];
  output: (type: "arraybuffer") => ArrayBuffer;
};

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 4000);
}

function fileStem(state: InventoryState) {
  const company = (state.companyName || "scope-3").replace(/[^\w]+/g, "-").replace(/^-|-$/g, "").toLowerCase();
  return `${company || "scope-3"}-${formatReportingYear(state.year) || "report"}`;
}

function ascii(value: string) {
  return value
    .replace(/₂/g, "2")
    .replace(/Σ/g, "Sum")
    .replace(/×/g, "x")
    .replace(/–|—/g, "-")
    .replace(/’|‘/g, "'")
    .replace(/“|”/g, '"')
    .replace(/é/g, "e");
}

function preparedName(value?: string) {
  return value?.trim() || "Not recorded";
}

function formatStamp(iso?: string) {
  if (!iso) return new Date().toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  const date = new Date(iso);
  if (!Number.isFinite(date.getTime())) return iso;
  return date.toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function selectedIncludes(includes: string[]) {
  const normalized = new Set(includes.map((label) => INCLUDE_ALIASES[label] ?? label));
  return (label: ReportInclude) => normalized.has(label);
}

function exclusionRows(state: InventoryState) {
  return SCOPE3_CATEGORIES.filter((category) => state.categories[category.id] !== "included").map((category) => ({
    id: category.id,
    name: category.name,
    status: state.categories[category.id] === "not_applicable" ? "Not applicable" : "Excluded",
    justification: state.justifications[category.id]?.trim() || "Not provided",
  }));
}

function activityRows(results: InventoryResult) {
  return results.categories.flatMap((category) =>
    category.items.map((item) => ({
      category: `${category.id} ${category.name}`,
      item: item.label,
      method: item.method,
      tco2e: item.tco2e,
      supplierTco2e: item.supplierTco2e,
      secondaryTco2e: item.secondaryTco2e,
      biogenicTco2e: item.biogenicTco2e,
      complete: item.complete ? "Yes" : "No",
      supplierVerified: item.supplierVerified ? "Verified by supplier" : "Not verified",
      factor: item.factor ? `${item.factor.factor} ${item.factor.unit}` : "",
      secondaryFactor: item.secondaryFactor ? `${item.secondaryFactor.factor} ${item.secondaryFactor.unit}` : "",
      source: item.factor ? `${item.factor.source} ${item.factor.year}`.trim() : "",
      fx:
        item.spendConversion != null
          ? `${item.spendConversion.from} to ${item.spendConversion.to} at ${item.spendConversion.rate}`
          : "",
      missing: item.missing.join("; "),
      working: item.steps.join("; "),
    })),
  );
}

function incompleteRows(results: InventoryResult) {
  return results.categories.flatMap((category) =>
    category.items
      .filter((item) => !item.complete)
      .map((item) => ({
        category: `${category.id}. ${category.name}`,
        item: item.label || "Untitled item",
        missing: item.missing.join("; ") || "Required inputs",
      })),
  );
}

function dataTypeLabel(category: InventoryResult["categories"][number]) {
  const supplier = category.supplierTco2e > 0;
  const secondary = category.secondaryTco2e > 0;
  if (supplier && secondary) return "Hybrid (supplier + secondary)";
  if (supplier) return "Supplier-specific / primary";
  if (secondary) return "Secondary";
  return "Not calculated";
}

function comparisonRows(current: InventoryResult, priorYears: ReportYearTotal[] | undefined, reportingYear: string) {
  const totals = new Map<string, number>();
  for (const row of priorYears ?? []) {
    if (!row.year) continue;
    totals.set(row.year, row.tco2e);
  }
  if (reportingYear) totals.set(reportingYear, current.totalTco2e);
  const years = [...totals.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  return years.map(([year, tco2e], index) => {
    const previous = index > 0 ? years[index - 1][1] : null;
    let change = "-";
    if (previous != null && previous !== 0) {
      const pct = ((tco2e - previous) / previous) * 100;
      change = `${pct > 0 ? "+" : ""}${pct.toFixed(1)}%`;
    } else if (previous === 0 && tco2e !== 0) {
      change = "n/a";
    }
    return { year, tco2e, change, current: year === reportingYear };
  });
}

function hotspotLine(results: InventoryResult) {
  const ranked = [...results.categories].filter((category) => category.tco2e > 0).sort((a, b) => b.tco2e - a.tco2e).slice(0, 3);
  if (!ranked.length) return "No calculated category total is available yet.";
  return `Largest sources: ${ranked.map((category) => `${category.id} ${category.name} (${formatShare(category.share)})`).join("; ")}.`;
}

function toBytes(value: unknown) {
  if (value instanceof Uint8Array) return value;
  if (value instanceof ArrayBuffer) return new Uint8Array(value);
  if (Array.isArray(value)) return Uint8Array.from(value as number[]);
  throw new Error("Could not encode the report file.");
}

async function loadAutoTable(): Promise<AutoTableFn> {
  const mod = await import("jspdf-autotable");
  const candidate = [mod.default, mod.autoTable].find((entry) => typeof entry === "function");
  if (typeof candidate !== "function") throw new Error("PDF table plugin failed to load.");
  return candidate as AutoTableFn;
}

async function loadXlsx() {
  const mod = (await import("xlsx")) as typeof import("xlsx") & { default?: typeof import("xlsx") };
  const XLSX = mod.utils ? mod : mod.default;
  if (!XLSX?.utils?.book_new || typeof XLSX.write !== "function") {
    throw new Error("Excel library failed to load.");
  }
  return XLSX;
}

export async function buildInventoryReport(
  state: InventoryState,
  results: InventoryResult,
  format: ReportFormat,
  includes: string[],
  options: ReportOptions = {},
): Promise<BuiltReport> {
  const filename = `${fileStem(state)}.${format === "pdf" ? "pdf" : "xlsx"}`;
  if (format === "pdf") {
    return {
      filename,
      mime: "application/pdf",
      bytes: await buildPdf(state, results, includes, options),
    };
  }
  return {
    filename,
    mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    bytes: await buildExcel(state, results, includes, options),
  };
}

export async function downloadInventoryReport(
  state: InventoryState,
  results: InventoryResult,
  format: ReportFormat,
  includes: string[],
  options: ReportOptions = {},
) {
  const file = await buildInventoryReport(state, results, format, includes, options);
  const copy = new Uint8Array(file.bytes.byteLength);
  copy.set(file.bytes);
  downloadBlob(new Blob([copy], { type: file.mime }), file.filename);
}

function ensureSpace(doc: PdfDoc, y: number, needed: number) {
  if (y + needed > PAGE_BOTTOM) {
    doc.addPage();
    return 48;
  }
  return y;
}

function writeHeading(doc: PdfDoc, title: string, y: number) {
  y = ensureSpace(doc, y, 32);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(25);
  doc.text(ascii(title), MARGIN_X, y);
  return y + 16;
}

function writeParagraph(doc: PdfDoc, text: string, y: number, pageWidth: number) {
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(40);
  const lines = doc.splitTextToSize(ascii(text), pageWidth - MARGIN_X * 2);
  y = ensureSpace(doc, y, lines.length * 14 + 8);
  doc.text(lines, MARGIN_X, y);
  return y + lines.length * 14 + 12;
}

function afterTable(doc: PdfDoc, y: number) {
  return (doc.lastAutoTable?.finalY ?? y) + 20;
}

function addTable(
  doc: PdfDoc,
  autoTable: AutoTableFn,
  y: number,
  head: string[][],
  body: string[][],
  columnStyles?: Record<number, { cellWidth?: number }>,
) {
  y = ensureSpace(doc, y, 36);
  autoTable(doc, {
    startY: y,
    head: head.map((row) => row.map(ascii)),
    body: body.map((row) => row.map(ascii)),
    styles: { fontSize: 8, cellPadding: 5, overflow: "linebreak", valign: "top" },
    headStyles: { fillColor: HEAD_FILL, textColor: 255, fontStyle: "bold" },
    margin: { left: MARGIN_X, right: MARGIN_X, bottom: 52 },
    columnStyles,
  });
  return afterTable(doc, y);
}

function coverMeta(state: InventoryState) {
  const boundary = BOUNDARY_COPY[state.boundary];
  return [
    state.year ? `Reporting year ${formatReportingYear(state.year)}` : "Reporting year not set",
    state.industry || null,
    state.hq ? `HQ ${state.hq}` : null,
    boundary ? `Boundary: ${boundary.label}` : null,
  ]
    .filter(Boolean)
    .join("  |  ");
}

async function buildPdf(state: InventoryState, results: InventoryResult, includes: string[], options: ReportOptions) {
  const { jsPDF } = await import("jspdf");
  const autoTable = await loadAutoTable();
  const doc = new jsPDF({ unit: "pt", format: "a4" }) as unknown as PdfDoc;
  const pageWidth = doc.internal.pageSize.getWidth();
  const want = selectedIncludes(includes);
  const boundary = BOUNDARY_COPY[state.boundary];
  const generated = formatStamp(options.generatedAt);
  let y = 48;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(20);
  doc.text("Scope 3 Emissions Report", MARGIN_X, y);
  y += 22;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text(ascii(state.companyName || "Company name not entered"), MARGIN_X, y);
  y += 16;
  doc.setFontSize(10);
  doc.setTextColor(70);
  const metaLines = doc.splitTextToSize(ascii(coverMeta(state)), pageWidth - MARGIN_X * 2);
  doc.text(metaLines, MARGIN_X, y);
  y += metaLines.length * 13 + 10;
  doc.text(ascii(`Prepared by ${preparedName(options.preparedBy)}  |  Generated ${generated}`), MARGIN_X, y);
  y += 22;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(20);
  doc.text(`${formatTco2e(results.totalTco2e)} tCO2e`, MARGIN_X, y);
  y += 18;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(70);
  doc.text(
    ascii(
      `${results.includedCount} of 15 categories included  |  ${results.completeItems}/${results.totalItems || 0} complete items (${results.completenessPct}%)  |  DQA ${results.dataQualityPct}%  |  verified supplier share ${formatShare(results.supplierSharePct)}`,
    ),
    MARGIN_X,
    y,
  );
  y += 24;

  if (want("Executive summary")) {
    y = writeHeading(doc, "Executive summary", y);
    const incomplete = results.totalItems - results.completeItems;
    const completeness =
      results.totalItems === 0
        ? "No activity items have been entered yet."
        : `${results.completeItems} of ${results.totalItems} activity items are complete. Incomplete items are counted as 0 tCO2e.`;
    const comparison = comparisonRows(results, options.priorYears, state.year);
    const previous = [...comparison].reverse().find((row) => !row.current);
    const yoy =
      previous && previous.tco2e !== 0
        ? ` Compared with ${formatReportingYear(previous.year)}, the total changed by ${comparison.find((row) => row.current)?.change ?? "-"} (${formatTco2e(previous.tco2e)} tCO2e to ${formatTco2e(results.totalTco2e)} tCO2e).`
        : "";
    const incompleteNote =
      incomplete > 0 ? ` ${incomplete} item${incomplete === 1 ? " still needs" : "s still need"} required inputs.` : "";
    y = writeParagraph(
      doc,
      `${state.companyName || "This company"} reports ${formatTco2e(results.totalTco2e)} tCO2e of scope 3 emissions for ${formatReportingYear(state.year) || "the reporting year"} under the ${boundary.label.toLowerCase()} approach. ${results.includedCount} of 15 GHG Protocol categories are included. Upstream ${formatTco2e(results.upstreamTco2e)} tCO2e; downstream ${formatTco2e(results.downstreamTco2e)} tCO2e. ${formatShare(results.supplierSharePct)} of the total is from supplier-verified data. Biogenic CO2 of ${formatTco2e(results.biogenicTco2e)} tCO2 is reported separately and is not included in the scope 3 total. ${completeness}${incompleteNote} ${hotspotLine(results)}${yoy}`,
      y,
      pageWidth,
    );
  }

  if (want("Organizational boundary")) {
    y = writeHeading(doc, "Organizational boundary", y);
    y = writeParagraph(
      doc,
      `This inventory uses the ${boundary.label} consolidation approach. ${boundary.detail} The same approach should be used across scopes 1, 2, and 3. Headquarters: ${state.hq?.trim() || "not entered"}. Industry: ${state.industry?.trim() || "not entered"}. Reporting year: ${formatReportingYear(state.year) || "not set"}.`,
      y,
      pageWidth,
    );
  }

  if (want("Category-wise results")) {
    y = writeHeading(doc, "Category-wise results", y);
    y = addTable(
      doc,
      autoTable,
      y,
      [["Category", "Method", "tCO2e", "Share", "Supplier", "Secondary"]],
      results.categories.map((category) => [
        `${category.id}. ${category.name}`,
        category.methodLabel || category.method || "—",
        formatTco2e(category.tco2e),
        `${category.share.toFixed(1)}%`,
        formatTco2e(category.supplierTco2e),
        formatTco2e(category.secondaryTco2e),
      ]),
      { 0: { cellWidth: 150 }, 1: { cellWidth: 110 } },
    );
  }

  if (want("Methodology and assumptions")) {
    y = writeHeading(doc, "Methodology and assumptions", y);
    y = writeParagraph(
      doc,
      "Each included category uses one GHG Protocol Technical Guidance method. Emissions are activity data x emission factor, converted to tCO2e. Spend in a foreign currency is converted at the reporting-year average rate unless an FX override is entered. Items missing required inputs or an emission factor are not calculated (0 tCO2e) and appear under Completeness. Biogenic CO2 is reported separately and is not in the scope 3 total. Emission factors keep the GWP values published by their source.",
      y,
      pageWidth,
    );
    y = addTable(
      doc,
      autoTable,
      y,
      [["Category", "Method", "Formula", "Data type"]],
      results.categories.map((category) => [
        `${category.id}. ${category.name}`,
        category.methodLabel || category.method || "Not selected",
        category.methodFormula || category.formula || "activity data x emission factor",
        dataTypeLabel(category),
      ]),
      { 2: { cellWidth: 180 } },
    );
  }

  if (want("Calculation working")) {
    y = writeHeading(doc, "Calculation working", y);
    const rows = results.categories.flatMap((category) =>
      category.items.map((item) => [
        `${category.id}. ${category.name}`,
        item.label || "Untitled item",
        item.steps.join("; ") || "—",
        item.complete ? formatTco2e(item.tco2e) : "0",
      ]),
    );
    if (!rows.length) {
      y = writeParagraph(doc, "No activity items have been entered for included categories.", y, pageWidth);
    } else {
      y = addTable(doc, autoTable, y, [["Category", "Item", "Working", "tCO2e"]], rows, {
        2: { cellWidth: 220 },
      });
    }
  }

  if (want("Completeness")) {
    y = writeHeading(doc, "Completeness", y);
    y = writeParagraph(
      doc,
      results.totalItems === 0
        ? "No activity items have been entered. Category totals stay at 0 tCO2e until required fields and an emission factor are present."
        : `${results.completeItems} of ${results.totalItems} activity items are complete (${results.completenessPct}%). Incomplete items stay at 0 tCO2e and are not included in the calculated total.`,
      y,
      pageWidth,
    );
    const missing = incompleteRows(results);
    if (missing.length) {
      y = addTable(
        doc,
        autoTable,
        y,
        [["Category", "Item", "Missing"]],
        missing.map((row) => [row.category, row.item, row.missing]),
        { 2: { cellWidth: 220 } },
      );
    }
  }

  if (want("Year-over-year comparison")) {
    y = writeHeading(doc, "Year-over-year comparison", y);
    const rows = comparisonRows(results, options.priorYears, state.year);
    if (rows.length < 2) {
      y = writeParagraph(
        doc,
        "No prior reporting year is saved for this company, so a year-over-year comparison is not available.",
        y,
        pageWidth,
      );
    } else {
      y = addTable(
        doc,
        autoTable,
        y,
        [["Year", "tCO2e", "Change vs previous"]],
        rows.map((row) => [
          `${formatReportingYear(row.year)}${row.current ? " (this report)" : ""}`,
          formatTco2e(row.tco2e),
          row.change,
        ]),
      );
    }
  }

  if (want("Exclusions with justification")) {
    y = writeHeading(doc, "Exclusions with justification", y);
    const rows = exclusionRows(state);
    if (!rows.length) {
      y = writeParagraph(doc, "All 15 GHG Protocol categories are included.", y, pageWidth);
    } else {
      y = addTable(
        doc,
        autoTable,
        y,
        [["Category", "Status", "Justification"]],
        rows.map((row) => [`${row.id}. ${row.name}`, row.status, row.justification]),
        { 2: { cellWidth: 260 } },
      );
    }
  }

  if (want("Data sources and emission factors")) {
    y = writeHeading(doc, "Data sources and emission factors", y);
    const rows = activityRows(results);
    if (!rows.length) {
      y = writeParagraph(doc, "No emission factors have been assigned yet.", y, pageWidth);
    } else {
      y = addTable(
        doc,
        autoTable,
        y,
        [["Item", "Factor", "Source", "Secondary", "FX"]],
        rows.map((row) => [row.item, row.factor || "Not selected", row.source || "—", row.secondaryFactor || "—", row.fx || "—"]),
      );
    }
  }

  if (want("Percent of emissions from supplier data")) {
    y = writeHeading(doc, "Supplier-specific share", y);
    y = writeParagraph(
      doc,
      `${formatShare(results.supplierSharePct)} of the scope 3 total is from supplier-verified data (${formatTco2e(results.supplierTco2e)} tCO2e verified, ${formatTco2e(results.unverifiedSupplierTco2e)} tCO2e company-entered supplier-specific data not yet confirmed, ${formatTco2e(results.secondaryTco2e)} tCO2e secondary). Only verified rows use the supplier reliability score.`,
      y,
      pageWidth,
    );
  }

  if (want("Biogenic CO₂ (reported separately)")) {
    y = writeHeading(doc, "Biogenic CO2 (reported separately)", y);
    y = writeParagraph(
      doc,
      `${formatTco2e(results.biogenicTco2e)} tCO2 of biogenic carbon dioxide is reported separately and is not included in the ${formatTco2e(results.totalTco2e)} tCO2e scope 3 total.`,
      y,
      pageWidth,
    );
  }

  if (want("Data quality assessment")) {
    y = writeHeading(doc, "Data quality", y);
    y = writeParagraph(
      doc,
      `Scores follow the GHG Protocol pedigree indicators on a 1-5 scale (technology, time, geography, completeness, reliability). Overall ${results.dqa.overall ? results.dqa.overall.toFixed(1) : "—"} of 5 (${results.dataQualityPct}%). Reliability is 5 only when the supplier has confirmed the activity data. Incomplete items score lower on completeness. Time and geography compare the factor year and region with this reporting year and headquarters.`,
      y,
      pageWidth,
    );
    y = addTable(
      doc,
      autoTable,
      y,
      [["Indicator", "Score (1-5)"]],
      [
        ...DQA_LABELS.map((row) => [row.label, results.dqa[row.key] ? results.dqa[row.key].toFixed(1) : "—"]),
        ["Overall", results.dqa.overall ? results.dqa.overall.toFixed(1) : "—"],
      ],
    );
  }

  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i += 1) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(120);
    doc.text(
      ascii(`${state.companyName || "Scope 3 report"}  |  ${formatReportingYear(state.year) || "Year not set"}  |  GHG Protocol Scope 3`),
      MARGIN_X,
      822,
    );
    doc.text(`${i} / ${pageCount}`, pageWidth - MARGIN_X, 822, { align: "right" });
  }

  return toBytes(doc.output("arraybuffer"));
}

async function buildExcel(state: InventoryState, results: InventoryResult, includes: string[], options: ReportOptions) {
  const XLSX = await loadXlsx();
  const workbook = XLSX.utils.book_new();
  const want = selectedIncludes(includes);
  const boundary = BOUNDARY_COPY[state.boundary];
  const generated = formatStamp(options.generatedAt);

  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.aoa_to_sheet([
      ["Scope 3 Emissions Report"],
      ["Company", state.companyName || ""],
      ["Reporting year", formatReportingYear(state.year) || ""],
      ["Industry", state.industry || ""],
      ["Headquarters", state.hq || ""],
      ["Boundary", boundary.label],
      ["Boundary detail", boundary.detail],
      ["Prepared by", preparedName(options.preparedBy)],
      ["Generated", generated],
      ["Total tCO2e", results.totalTco2e],
      ["Upstream tCO2e", results.upstreamTco2e],
      ["Downstream tCO2e", results.downstreamTco2e],
      ["Biogenic CO2 (reported separately)", results.biogenicTco2e],
      ["Supplier tCO2e (verified)", results.supplierTco2e],
      ["Unverified supplier tCO2e", results.unverifiedSupplierTco2e],
      ["Secondary tCO2e", results.secondaryTco2e],
      ["Supplier share %", results.supplierSharePct],
      ["Categories included", results.includedCount],
      ["Complete items", results.completeItems],
      ["Total items", results.totalItems],
      ["Completeness %", results.completenessPct],
      ["DQA %", results.dataQualityPct],
      ["DQA technology", results.dqa.technology],
      ["DQA time", results.dqa.time],
      ["DQA geography", results.dqa.geography],
      ["DQA completeness", results.dqa.completeness],
      ["DQA reliability", results.dqa.reliability],
      ["DQA overall", results.dqa.overall],
    ]),
    "Summary",
  );

  if (want("Category-wise results")) {
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(
        results.categories.map((category) => ({
          Category: category.id,
          Name: category.name,
          Stream: category.stream,
          Method: category.methodLabel || category.method,
          tCO2e: category.tco2e,
          Share: category.share,
          SupplierTco2e: category.supplierTco2e,
          SecondaryTco2e: category.secondaryTco2e,
          BiogenicCO2: category.biogenicTco2e,
          CompleteItems: category.completeCount,
          Items: category.items.length,
        })),
      ),
      "Categories",
    );
  }

  if (want("Methodology and assumptions")) {
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(
        results.categories.map((category) => ({
          Category: category.id,
          Name: category.name,
          Method: category.methodLabel || category.method,
          Formula: category.methodFormula || category.formula,
          DataType: dataTypeLabel(category),
        })),
      ),
      "Methodology",
    );
  }

  if (want("Calculation working")) {
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(
        results.categories.flatMap((category) =>
          category.items.map((item) => ({
            Category: `${category.id} ${category.name}`,
            Item: item.label,
            Complete: item.complete ? "Yes" : "No",
            tCO2e: item.tco2e,
            Working: item.steps.join("; "),
            Missing: item.missing.join("; "),
          })),
        ),
      ),
      "Working",
    );
  }

  if (want("Completeness")) {
    const missing = incompleteRows(results);
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(
        missing.length
          ? missing
          : [{ category: "All items complete", item: "", missing: `${results.completeItems}/${results.totalItems || 0}` }],
      ),
      "Completeness",
    );
  }

  if (want("Year-over-year comparison")) {
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(
        comparisonRows(results, options.priorYears, state.year).map((row) => ({
          Year: formatReportingYear(row.year),
          tCO2e: row.tco2e,
          ChangeVsPrevious: row.change,
          ThisReport: row.current ? "Yes" : "No",
        })),
      ),
      "Year comparison",
    );
  }

  if (want("Data sources and emission factors")) {
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(activityRows(results)), "Activity");
  }

  if (want("Exclusions with justification")) {
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(exclusionRows(state)), "Exclusions");
  }

  if (want("Data quality assessment")) {
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet([
        ...DQA_LABELS.map((row) => ({ Indicator: row.label, Score: results.dqa[row.key] })),
        { Indicator: "Overall", Score: results.dqa.overall },
      ]),
      "Data quality",
    );
  }

  if (want("Percent of emissions from supplier data")) {
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet([
        { Metric: "Verified supplier tCO2e", Value: results.supplierTco2e },
        { Metric: "Unverified supplier tCO2e", Value: results.unverifiedSupplierTco2e },
        { Metric: "Secondary tCO2e", Value: results.secondaryTco2e },
        { Metric: "Verified supplier share %", Value: results.supplierSharePct },
      ]),
      "Supplier data",
    );
  }

  return toBytes(XLSX.write(workbook, { bookType: "xlsx", type: "array" }));
}
