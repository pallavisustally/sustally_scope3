import type { EmissionFactor } from "@/data/protocol";
import type { InventoryState } from "@/lib/inventory-types";

export const CUSTOM_FACTOR_OPTION = "__enter_own__";
export const CUSTOM_PRIMARY_KEY = "__customFactor";
export const CUSTOM_SECONDARY_KEY = "__customSecondaryFactor";

export type CustomFactorDraft = {
  factor: string;
  unit: string;
  source: string;
  year: string;
  region: string;
  type: string;
};

export function customFactorId(itemId: string, slot: "supplier" | "secondary" = "supplier") {
  return slot === "secondary" ? `custom-${itemId}-secondary` : `custom-${itemId}`;
}

export function customFactorKey(slot: "supplier" | "secondary" = "supplier") {
  return slot === "secondary" ? CUSTOM_SECONDARY_KEY : CUSTOM_PRIMARY_KEY;
}

export function parseCustomFactor(raw: string | undefined, id: string, categoryId: number): EmissionFactor | null {
  if (!raw?.trim()) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<CustomFactorDraft>;
    const factor = String(parsed.factor ?? "").trim();
    const unit = String(parsed.unit ?? "").trim();
    if (!factor || !unit) return null;
    return {
      id,
      factor,
      unit,
      source: String(parsed.source ?? "").trim() || "User-entered",
      year: String(parsed.year ?? "").trim(),
      region: String(parsed.region ?? "").trim(),
      type: String(parsed.type ?? "").trim() || "Custom",
      categories: [categoryId],
    };
  } catch {
    return null;
  }
}

export function serializeCustomFactor(draft: CustomFactorDraft) {
  return JSON.stringify({
    factor: draft.factor.trim(),
    unit: draft.unit.trim(),
    source: draft.source.trim(),
    year: draft.year.trim(),
    region: draft.region.trim(),
    type: draft.type.trim(),
  });
}

export function customFactorsFromState(state: InventoryState): EmissionFactor[] {
  const rows: EmissionFactor[] = [];
  for (const [key, entry] of Object.entries(state.entries)) {
    const categoryId = Number(key);
    if (!Number.isFinite(categoryId) || !entry) continue;
    for (const item of entry.items) {
      const primary = parseCustomFactor(item.values[CUSTOM_PRIMARY_KEY], customFactorId(item.id), categoryId);
      if (primary) rows.push(primary);
      const secondary = parseCustomFactor(item.values[CUSTOM_SECONDARY_KEY], customFactorId(item.id, "secondary"), categoryId);
      if (secondary) rows.push(secondary);
    }
  }
  return rows;
}

export function mergeCustomFactors(catalog: EmissionFactor[], state: InventoryState) {
  const extras = customFactorsFromState(state);
  if (!extras.length) return catalog;
  const ids = new Set(extras.map((row) => row.id));
  return [...catalog.filter((row) => !ids.has(row.id)), ...extras];
}

export function factorOptionLabel(factor: EmissionFactor, compact = false) {
  if (compact) {
    const type = factor.type?.trim();
    return type ? `${factor.factor} ${factor.unit} · ${type}` : `${factor.factor} ${factor.unit}`;
  }
  const detail = [factor.source, factor.year ? `(${factor.year})` : "", factor.region, factor.type].filter(Boolean).join(" · ");
  return detail ? `${factor.factor} ${factor.unit} · ${detail}` : `${factor.factor} ${factor.unit}`;
}
