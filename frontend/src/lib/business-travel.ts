import { EMISSION_FACTORS, type EmissionFactor } from "@/data/protocol";

export const TRAVEL_MODES = ["Air", "Rail", "Car", "Bus", "Taxi", "Ferry"] as const;
export type TravelMode = (typeof TRAVEL_MODES)[number];

export const AIR_HAULS = ["Domestic", "Short-haul", "Long-haul"] as const;
export const AIR_CABINS = ["Economy", "Premium economy", "Business", "First"] as const;

function unitPer(factor: EmissionFactor) {
  return factor.unit.split("/")[1]?.trim().toLowerCase() ?? "";
}

function isDistanceFactor(factor: EmissionFactor) {
  const per = unitPer(factor);
  return per === "km" || per === "pkm";
}

function isFuelFactor(factor: EmissionFactor) {
  const per = unitPer(factor);
  return per === "litre" || per === "kwh" || per === "kg";
}

function isSpendFactor(factor: EmissionFactor) {
  return /usd/i.test(factor.unit);
}

function slugHaul(value: string) {
  const haul = value.trim().toLowerCase();
  if (haul.startsWith("domestic")) return "domestic";
  if (haul.startsWith("long")) return "long";
  return "short";
}

function slugCabin(value: string) {
  const cabin = value.trim().toLowerCase();
  if (cabin.includes("first")) return "first";
  if (cabin.includes("business")) return "business";
  if (cabin.includes("premium")) return "premium";
  return "economy";
}

export function isTravelMode(value: string): value is TravelMode {
  return (TRAVEL_MODES as readonly string[]).includes(value);
}

export function travelFactorIdFor(input: {
  method: string;
  mode?: string;
  haulLength?: string;
  cabinClass?: string;
  fuelType?: string;
}) {
  const mode = (input.mode ?? "").trim();
  if (input.method === "spend-based") {
    if (mode === "Air") return "c6-spend-air";
    if (mode === "Rail") return "c6-spend-rail";
    if (mode === "Car") return "c6-spend-car";
    if (mode === "Taxi") return "c6-spend-taxi";
    if (mode === "Bus") return "c6-spend-bus";
    if (mode === "Ferry") return "c6-spend-ferry";
    return "eeio-travel";
  }
  if (input.method === "fuel-based") {
    const fuel = (input.fuelType ?? "").trim().toLowerCase();
    if (fuel.includes("jet")) return "c6-jet";
    if (fuel.includes("petrol")) return "c6-petrol";
    if (fuel.includes("diesel")) return "c6-diesel";
    if (fuel.includes("electric")) return "c6-electric";
    if (mode === "Air") return "c6-jet";
    if (mode === "Rail") return "c6-electric";
    if (mode === "Ferry" || mode === "Bus") return "c6-diesel";
    if (mode === "Car" || mode === "Taxi") return "c6-petrol";
    return "";
  }
  if (mode === "Air") {
    return `c6-air-${slugHaul(input.haulLength || "Short-haul")}-${slugCabin(input.cabinClass || "Economy")}`;
  }
  if (mode === "Rail") return "c6-rail";
  if (mode === "Car") return "c6-car";
  if (mode === "Taxi") return "c6-taxi";
  if (mode === "Bus") return "c6-bus";
  if (mode === "Ferry") return "c6-ferry";
  return "";
}

export function factorsForTravelItem(
  method: string,
  values: Record<string, string>,
  catalog: EmissionFactor[] = EMISSION_FACTORS,
): EmissionFactor[] {
  const ids = new Set(catalog.map((row) => row.id));
  const merged = [...catalog, ...EMISSION_FACTORS.filter((row) => row.categories.includes(6) && !ids.has(row.id))];
  const all = merged.filter((row) => row.categories.includes(6));
  const pool =
    method === "fuel-based" ? all.filter(isFuelFactor) : method === "spend-based" ? all.filter(isSpendFactor) : all.filter(isDistanceFactor);
  const rows = pool.length ? pool : all;
  const preferredId = travelFactorIdFor({
    method,
    mode: values.mode,
    haulLength: values.haulLength,
    cabinClass: values.cabinClass,
    fuelType: values.fuelType,
  });
  const preferred = rows.find((row) => row.id === preferredId);
  const rest = rows.filter((row) => row.id !== preferredId);
  return preferred ? [preferred, ...rest] : rows;
}
