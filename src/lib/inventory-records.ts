import type { SavedInventorySummary } from "@/lib/collections-map";
import type { InventoryState } from "@/lib/inventory-types";

export function isBlankInventory(state: InventoryState) {
  const included = Object.values(state.categories).some((value) => value === "included");
  return !state.companyName.trim() && !state.year && !included;
}

function isPlaceholderName(name: string) {
  const value = name.trim().toLowerCase();
  return !value || value === "untitled company";
}

export function visibleRecords(
  state: InventoryState,
  saved: SavedInventorySummary[],
  currentTotal = 0,
): SavedInventorySummary[] {
  const byKey = new Map<string, SavedInventorySummary>();
  for (const row of saved) {
    if (!row.sessionKey) continue;
    if (!row.year && isPlaceholderName(row.name)) continue;
    byKey.set(row.sessionKey, row);
  }
  if (state.sessionKey && (state.year || state.companyName.trim())) {
    const existing = byKey.get(state.sessionKey);
    byKey.set(state.sessionKey, {
      id: existing?.id ?? state.sessionKey,
      sessionKey: state.sessionKey,
      name: state.companyName.trim() || existing?.name || "Untitled company",
      year: state.year || existing?.year || "",
      industry: state.industry || existing?.industry || "",
      updatedAt: existing?.updatedAt || "",
      totalTco2e: currentTotal || existing?.totalTco2e || 0,
    });
  }
  return [...byKey.values()].sort((a, b) => {
    if (a.year && b.year && a.year !== b.year) return b.year.localeCompare(a.year);
    if (a.year && !b.year) return -1;
    if (!a.year && b.year) return 1;
    return (a.name || "").localeCompare(b.name || "");
  });
}
