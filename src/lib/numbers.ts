export function parseAmount(value: string | undefined | null): number | null {
  if (value == null) return null;
  const trimmed = value.replace(/,/g, "").replace(/\s/g, "").trim();
  if (!trimmed) return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
}

export function formatTco2e(value: number): string {
  if (!Number.isFinite(value) || value === 0) return "0";
  if (Math.abs(value) < 0.001) return value.toExponential(2);
  const digits = Math.abs(value) < 10 ? 3 : Math.abs(value) < 100 ? 2 : 1;
  return value.toLocaleString(undefined, { maximumFractionDigits: digits });
}

export function formatShare(value: number): string {
  if (!Number.isFinite(value) || value === 0) return "0%";
  if (value < 0.1) return "<0.1%";
  return `${value.toFixed(value < 10 ? 1 : 0)}%`;
}

export function toKg(quantity: number, unit: string): number {
  const u = unit.toLowerCase();
  if (u.startsWith("tonne") || u === "t") return quantity * 1000;
  return quantity;
}

export function toTonnes(quantity: number, unit: string): number {
  const u = unit.toLowerCase();
  if (u.startsWith("kilogram") || u === "kg") return quantity / 1000;
  return quantity;
}

export function toKm(quantity: number, unit: string): number {
  return unit.toLowerCase() === "miles" ? quantity * 1.60934 : quantity;
}

export function toKwh(quantity: number, unit: string): number {
  const u = unit.toLowerCase();
  if (u === "mwh") return quantity * 1000;
  if (u === "gj") return quantity * 277.778;
  return quantity;
}

export function toM2(quantity: number, unit: string): number {
  const u = unit.toLowerCase();
  if (u.includes("ft")) return quantity * 0.092903;
  return quantity;
}

export function factorDenominator(unit: string): string {
  const parts = unit.split("/");
  return (parts[1] ?? "").trim().toLowerCase();
}

export function factorIsTonnes(unit: string): boolean {
  const prefix = unit.split("/")[0]?.toLowerCase() ?? "";
  return prefix.startsWith("tco2") || prefix.startsWith("t co2");
}
