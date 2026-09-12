import { SCOPE3_CATEGORIES } from "@/data/protocol";
import type { InventoryResult } from "@/lib/calculate";
import { DQA_LABELS } from "@/lib/data-quality";
import type { InventoryState } from "@/lib/inventory-types";
import { formatShare, formatTco2e } from "@/lib/numbers";

export type ReportFormat = "pdf" | "xlsx";

export type BuiltReport = {
  bytes: Uint8Array;
  mime: string;
  filename: string;
};

type AutoTableFn = (doc: object, options: Record<string, unknown>) => void;

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
  return `${company || "scope-3"}-${state.year || "inventory"}`;
}

function exclusionRows(state: InventoryState) {
  return SCOPE3_CATEGORIES.filter((category) => state.categories[category.id] !== "included").map((category) => ({
    id: category.id,
    name: category.name,
    status: state.categories[category.id] === "not_applicable" ? "Not applicable" : "Excluded",
    justification: state.justifications[category.id]?.trim() || "Not provided",
  }));
}

function activityRows(state: InventoryState, results: InventoryResult) {
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
      factor: item.factor ? `${item.factor.factor} ${item.factor.unit}` : "",
      secondaryFactor: item.secondaryFactor ? `${item.secondaryFactor.factor} ${item.secondaryFactor.unit}` : "",
      source: item.factor ? `${item.factor.source} ${item.factor.year}`.trim() : "",
      fx:
        item.spendConversion != null
          ? `${item.spendConversion.from} to ${item.spendConversion.to} at ${item.spendConversion.rate}`
          : "",
      missing: item.missing.join("; "),
    })),
  );
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
): Promise<BuiltReport> {
  const filename = `${fileStem(state)}.${format === "pdf" ? "pdf" : "xlsx"}`;
  if (format === "pdf") {
    return {
      filename,
      mime: "application/pdf",
      bytes: await buildPdf(state, results, includes),
    };
  }
  return {
    filename,
    mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    bytes: await buildExcel(state, results, includes),
  };
}

export async function downloadInventoryReport(
  state: InventoryState,
  results: InventoryResult,
  format: ReportFormat,
  includes: string[],
) {
  const file = await buildInventoryReport(state, results, format, includes);
  const copy = new Uint8Array(file.bytes.byteLength);
  copy.set(file.bytes);
  downloadBlob(new Blob([copy], { type: file.mime }), file.filename);
}

async function buildPdf(state: InventoryState, results: InventoryResult, includes: string[]) {
  const { jsPDF } = await import("jspdf");
  const autoTable = await loadAutoTable();
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 48;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("Scope 3 Emissions Report", 40, y);
  y += 22;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text(state.companyName || "Company name not entered", 40, y);
  y += 16;
  doc.text(
    [
      state.year ? `Reporting year ${state.year}` : "Reporting year not set",
      state.industry || null,
      state.boundary ? `Boundary: ${state.boundary}` : null,
    ]
      .filter(Boolean)
      .join("  |  "),
    40,
    y,
  );
  y += 28;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text(`${formatTco2e(results.totalTco2e)} tCO2e`, 40, y);
  y += 18;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(
    `${results.includedCount} categories included  |  ${results.completeItems}/${results.totalItems || 0} complete items  |  DQA ${results.dataQualityPct}%  |  supplier share ${formatShare(results.supplierSharePct)}`,
    40,
    y,
  );
  y += 20;

  const want = (label: string) => includes.includes(label);

  if (want("Executive summary") || includes.length === 0) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text("Executive summary", 40, y);
    y += 16;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    const summary = doc.splitTextToSize(
      `${state.companyName || "This company"} reports ${formatTco2e(results.totalTco2e)} tCO2e of scope 3 emissions for ${state.year || "the reporting year"}. ${results.includedCount} of 15 GHG Protocol categories are included. ${formatShare(results.supplierSharePct)} of the total is from supplier-specific data. Biogenic CO2 of ${formatTco2e(results.biogenicTco2e)} tCO2 is reported separately and is not included in the scope 3 total.`,
      pageWidth - 80,
    );
    doc.text(summary, 40, y);
    y += summary.length * 14 + 10;
  }

  if (want("Category-wise results") || includes.length === 0) {
    autoTable(doc, {
      startY: y,
      head: [["Category", "Stream", "tCO2e", "Share", "Supplier", "Secondary"]],
      body: results.categories.map((category) => [
        `${category.id}. ${category.name}`,
        category.stream,
        formatTco2e(category.tco2e),
        `${category.share.toFixed(1)}%`,
        formatTco2e(category.supplierTco2e),
        formatTco2e(category.secondaryTco2e),
      ]),
      styles: { fontSize: 8, cellPadding: 5 },
      headStyles: { fillColor: [142, 77, 255] },
      margin: { left: 40, right: 40 },
    });
    y = ((doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y) + 22;
  }

  if (want("Exclusions with justification")) {
    autoTable(doc, {
      startY: y,
      head: [["Category", "Status", "Justification"]],
      body: exclusionRows(state).map((row) => [`${row.id}. ${row.name}`, row.status, row.justification]),
      styles: { fontSize: 8, cellPadding: 5 },
      headStyles: { fillColor: [142, 77, 255] },
      margin: { left: 40, right: 40 },
      columnStyles: { 2: { cellWidth: 260 } },
    });
    y = ((doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y) + 22;
  }

  if (want("Data sources and emission factors")) {
    autoTable(doc, {
      startY: y,
      head: [["Item", "Factor", "Secondary", "FX"]],
      body: activityRows(state, results).map((row) => [row.item, row.factor || "Not selected", row.secondaryFactor || "—", row.fx || "—"]),
      styles: { fontSize: 8, cellPadding: 5 },
      headStyles: { fillColor: [142, 77, 255] },
      margin: { left: 40, right: 40 },
    });
    y = ((doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y) + 22;
  }

  if (want("Percent of emissions from supplier data")) {
    if (y > 720) {
      doc.addPage();
      y = 48;
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text("Supplier-specific share", 40, y);
    y += 16;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(
      `${formatShare(results.supplierSharePct)} of scope 3 total (${formatTco2e(results.supplierTco2e)} tCO2e supplier-specific, ${formatTco2e(results.secondaryTco2e)} tCO2e secondary).`,
      40,
      y,
    );
    y += 22;
  }

  if (want("Biogenic CO₂ reported separately")) {
    if (y > 720) {
      doc.addPage();
      y = 48;
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text("Biogenic CO2", 40, y);
    y += 16;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(
      `${formatTco2e(results.biogenicTco2e)} tCO2 of biogenic carbon dioxide is reported separately and is not included in the ${formatTco2e(results.totalTco2e)} tCO2e scope 3 total.`,
      40,
      y,
    );
    y += 22;
  }

  if (want("Data quality assessment")) {
    if (y > 680) {
      doc.addPage();
      y = 48;
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text("Data quality", 40, y);
    y += 16;
    autoTable(doc, {
      startY: y,
      head: [["Indicator", "Score (1-5)"]],
      body: [
        ...DQA_LABELS.map((row) => [row.label, results.dqa[row.key] ? results.dqa[row.key].toFixed(1) : "—"]),
        ["Overall", results.dqa.overall ? results.dqa.overall.toFixed(1) : "—"],
      ],
      styles: { fontSize: 8, cellPadding: 5 },
      headStyles: { fillColor: [142, 77, 255] },
      margin: { left: 40, right: 40 },
    });
  }

  return toBytes(doc.output("arraybuffer"));
}

async function buildExcel(state: InventoryState, results: InventoryResult, includes: string[]) {
  const XLSX = await loadXlsx();
  const workbook = XLSX.utils.book_new();
  const want = (label: string) => includes.includes(label) || includes.length === 0;

  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.aoa_to_sheet([
      ["Scope 3 Emissions Report"],
      ["Company", state.companyName || ""],
      ["Reporting year", state.year || ""],
      ["Industry", state.industry || ""],
      ["Headquarters", state.hq || ""],
      ["Boundary", state.boundary],
      ["Total tCO2e", results.totalTco2e],
      ["Biogenic tCO2", results.biogenicTco2e],
      ["Supplier tCO2e", results.supplierTco2e],
      ["Secondary tCO2e", results.secondaryTco2e],
      ["Supplier share %", results.supplierSharePct],
      ["Categories included", results.includedCount],
      ["Complete items", results.completeItems],
      ["Total items", results.totalItems],
      ["DQA %", results.dataQualityPct],
      ["DQA technology", results.dqa.technology],
      ["DQA time", results.dqa.time],
      ["DQA geography", results.dqa.geography],
      ["DQA completeness", results.dqa.completeness],
      ["DQA reliability", results.dqa.reliability],
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
          tCO2e: category.tco2e,
          Share: category.share,
          SupplierTco2e: category.supplierTco2e,
          SecondaryTco2e: category.secondaryTco2e,
          BiogenicTco2e: category.biogenicTco2e,
          CompleteItems: category.completeCount,
          Items: category.items.length,
        })),
      ),
      "Categories",
    );
  }

  if (want("Data sources and emission factors") || want("Methodology and assumptions")) {
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(activityRows(state, results)), "Activity");
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

  return toBytes(XLSX.write(workbook, { bookType: "xlsx", type: "array" }));
}
