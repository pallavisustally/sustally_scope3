import { makeItem } from "@/lib/inventory-defaults";
import type { ActivityItem, CategoryEntry } from "@/lib/inventory-types";

export function methodItemMap(entry: CategoryEntry): Record<string, ActivityItem[]> {
  return { ...(entry.itemsByMethod ?? {}), [entry.method]: entry.items };
}

export function dedupeItems(items: ActivityItem[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

export function itemHasCalcInput(item: ActivityItem) {
  if (item.factorId.trim()) return true;
  return Object.entries(item.values).some(([key, value]) => {
    if (!value.trim() || key.startsWith("__")) return false;
    if (key === "item" || key === "supplierEmail" || key === "surveyId") return false;
    return true;
  });
}

export function switchCategoryMethod(entry: CategoryEntry, categoryId: number, method: string): CategoryEntry {
  if (!method || entry.method === method) return entry;
  const itemsByMethod = methodItemMap(entry);
  const nextItems = itemsByMethod[method]?.length ? itemsByMethod[method] : [makeItem(categoryId, 1, method)];
  return {
    ...entry,
    method,
    items: nextItems,
    itemsByMethod: { ...itemsByMethod, [method]: nextItems },
  };
}

export function storedMethodItems(entry: CategoryEntry) {
  return Object.entries(methodItemMap(entry))
    .map(([method, items]) => ({ method, items: dedupeItems(items) }))
    .filter((row) => row.items.length);
}
