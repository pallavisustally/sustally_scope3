export const REPORTING_YEARS = [
  { value: "2026", label: "FY2026-27" },
  { value: "2025", label: "FY2025-26" },
  { value: "2024", label: "FY2024-25" },
  { value: "2023", label: "FY2023-24" },
  { value: "2022", label: "FY2022-23" },
] as const;

export function reportingYearStart(year: string | number | null | undefined) {
  const raw = String(year ?? "").trim();
  if (!raw) return "";
  const fy = /^FY\s*(\d{4})/i.exec(raw);
  if (fy) return fy[1];
  const start = Number(raw);
  return Number.isFinite(start) ? String(start) : raw;
}

export function formatReportingYear(year: string | number | null | undefined) {
  const raw = String(year ?? "").trim();
  if (!raw) return "";
  if (/^FY/i.test(raw)) return raw.replace(/\s+/g, "");
  const start = Number(reportingYearStart(raw));
  if (!Number.isFinite(start)) return raw;
  const end = String((start + 1) % 100).padStart(2, "0");
  return `FY${start}-${end}`;
}
