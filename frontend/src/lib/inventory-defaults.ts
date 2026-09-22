import { blankValues } from "@/data/fields";
import { getCategory, SCOPE3_CATEGORIES, type Inclusion } from "@/data/protocol";
import type { ActivityItem, CategoryEntry, InventoryState } from "@/lib/inventory-types";

export const SESSION_STORAGE_KEY = "sustally-session-key";

export function inventoryStorageKey(userId: string) {
  return `${SESSION_STORAGE_KEY}:${userId}`;
}

export function emptyCategories(): Record<number, Inclusion> {
  return Object.fromEntries(SCOPE3_CATEGORIES.map((category) => [category.id, "excluded"])) as Record<number, Inclusion>;
}

export function makeItem(categoryId: number, index = 1, method?: string): ActivityItem {
  return {
    id: method ? `c${categoryId}-${method}-${index}` : `c${categoryId}-${index}`,
    factorId: "",
    secondaryFactorId: "",
    values: blankValues(categoryId),
  };
}

export function defaultMethod(categoryId: number) {
  return getCategory(categoryId).methods[0]?.id ?? "average-data";
}

export function makeEntry(categoryId: number): CategoryEntry {
  const method = defaultMethod(categoryId);
  return {
    method,
    items: [makeItem(categoryId, 1, method)],
    activityDone: false,
    methodDone: false,
    factorsDone: false,
  };
}

export function newSessionKey() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `session-${Date.now()}`;
}

export const emptyInventory = (): InventoryState => ({
  sessionKey: "",
  companyName: "",
  industry: "",
  year: "",
  hq: "",
  boundary: "operational",
  categories: emptyCategories(),
  justifications: {},
  activeCategoryId: 1,
  entries: {},
});
