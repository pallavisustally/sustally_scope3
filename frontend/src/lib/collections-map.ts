import { itemLabel } from "@/data/fields";
import { SCOPE3_CATEGORIES, type Inclusion } from "@/data/protocol";
import { emptyCategories, emptyInventory, makeEntry } from "@/lib/inventory-defaults";
import { storedMethodItems } from "@/lib/inventory-method";
import type { CategoryEntry, InventoryState } from "@/lib/inventory-types";

export type CollectionDoc = {
  id: string;
  [key: string]: unknown;
};

export type InventoryCollections = {
  companies: CollectionDoc[];
  "category-selections": CollectionDoc[];
  "activity-items": CollectionDoc[];
  "inventory-results": CollectionDoc[];
};

export type SavedInventorySummary = {
  id: string;
  sessionKey: string;
  name: string;
  year: string;
  industry: string;
  updatedAt: string;
  totalTco2e: number;
};

function asInclusion(value: unknown): Inclusion {
  if (value === "included" || value === "not_applicable" || value === "excluded") return value;
  return "excluded";
}

function asRecord(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, entry == null ? "" : String(entry)]));
}

function text(value: unknown) {
  return typeof value === "string" ? value : value == null ? "" : String(value);
}

const STEP_VALUE_KEYS = [
  "__activityDone",
  "__methodDone",
  "__factorsDone",
  "__commuteSource",
  "__commuteRemainder",
  "__activeMethod",
] as const;

function flagFrom(value: unknown) {
  return value === true || value === "1" || value === "true";
}

function stripStepValues(values: Record<string, string>) {
  const next = { ...values };
  for (const key of STEP_VALUE_KEYS) delete next[key];
  return next;
}

function entrySteps(entry: CategoryEntry) {
  return {
    __activityDone: entry.activityDone ? "1" : "",
    __methodDone: entry.methodDone ? "1" : "",
    __factorsDone: entry.factorsDone ? "1" : "",
    __commuteSource: entry.commuteSource ?? "",
    __commuteRemainder: entry.commuteRemainder ?? "",
    __activeMethod: entry.method,
  };
}

export function toCollectionDocs(
  state: InventoryState,
  extras?: { totalTco2e?: number; byCategory?: unknown; dataQualityPct?: number },
): InventoryCollections {
  return {
    companies: [
      {
        id: "current",
        sessionKey: state.sessionKey,
        name: state.companyName,
        industry: state.industry,
        reportingYear: state.year ? Number(state.year) : null,
        headquarters: state.hq,
        boundary: state.boundary,
      },
    ],
    "category-selections": SCOPE3_CATEGORIES.map((category) => ({
      id: `cat-${category.id}`,
      company: "current",
      categoryId: category.id,
      status: state.categories[category.id] ?? "excluded",
      justification: state.justifications[category.id] ?? "",
    })),
    "activity-items": Object.entries(state.entries).flatMap(([categoryId, entry]) =>
      storedMethodItems(entry).flatMap(({ method, items }) =>
        items.map((item) => ({
          id: item.id,
          company: "current",
          categoryId: Number(categoryId),
          method,
          factorId: item.factorId,
          factorCodeSecondary: item.secondaryFactorId,
          item: itemLabel(item.values),
          quantity: item.values.quantity ?? item.values.energyQuantity ?? item.values.fuelQuantity ?? "",
          unit: item.values.unit ?? item.values.energyUnit ?? item.values.fuelUnit ?? "",
          spend: item.values.spend ?? "",
          supplier: item.values.supplier ?? "",
          values: { ...item.values, secondaryFactorId: item.secondaryFactorId, ...entrySteps(entry) },
        })),
      ),
    ),
    "inventory-results": extras
      ? [
          {
            id: "current",
            company: "current",
            year: state.year ? Number(state.year) : null,
            totalTco2e: extras.totalTco2e ?? 0,
            byCategory: extras.byCategory ?? [],
            dataQualityPct: extras.dataQualityPct ?? 0,
          },
        ]
      : [],
  };
}

export function stateFromPayload(input: {
  sessionKey: string;
  company?: Record<string, unknown> | null;
  selections?: Record<string, unknown>[];
  items?: Record<string, unknown>[];
}): InventoryState {
  const state = emptyInventory();
  state.sessionKey = input.sessionKey;
  const company = input.company;
  if (company) {
    state.companyName = text(company.name);
    state.industry = text(company.industry);
    state.year = company.reportingYear == null || company.reportingYear === "" ? "" : String(company.reportingYear);
    state.hq = text(company.headquarters);
    const boundary = company.boundary;
    if (boundary === "operational" || boundary === "financial" || boundary === "equity") state.boundary = boundary;
  }

  const categories = emptyCategories();
  const justifications: Record<number, string> = {};
  for (const row of input.selections ?? []) {
    const id = Number(row.categoryId);
    if (!Number.isFinite(id)) continue;
    categories[id] = asInclusion(row.status);
    justifications[id] = text(row.justification);
  }
  state.categories = categories;
  state.justifications = justifications;

  const grouped = new Map<number, CategoryEntry>();
  const activeByCategory = new Map<number, string>();
  for (const row of input.items ?? []) {
    const categoryId = Number(row.categoryId);
    if (!Number.isFinite(categoryId)) continue;
    const existing = grouped.get(categoryId) ?? {
      method: text(row.method) || "average-data",
      items: [],
      itemsByMethod: {},
      activityDone: false,
      methodDone: false,
      factorsDone: false,
    };
    const method = text(row.method) || existing.method;
    const index = (existing.itemsByMethod?.[method]?.length ?? 0) + 1;
    const values = asRecord(row.values);
    const activeMethod = text(values.__activeMethod);
    if (activeMethod) activeByCategory.set(categoryId, activeMethod);
    const source = text(row.commuteSource) || values.__commuteSource;
    if (source === "survey" || source === "manual") existing.commuteSource = source;
    const remainder = text(row.commuteRemainder) || values.__commuteRemainder;
    if (remainder === "proportional" || remainder === "manual" || remainder === "responses-only") {
      existing.commuteRemainder = remainder;
    }
    const secondaryFactorId = text(row.factorCodeSecondary) || values.secondaryFactorId || "";
    existing.activityDone = existing.activityDone || flagFrom(row.activityDone) || flagFrom(values.__activityDone);
    existing.methodDone = existing.methodDone || flagFrom(row.methodDone) || flagFrom(values.__methodDone);
    existing.factorsDone = existing.factorsDone || flagFrom(row.factorsDone) || flagFrom(values.__factorsDone);
    delete values.secondaryFactorId;
    const id = text(row.clientItemId) || text(row.id) || `c${categoryId}-${method}-${index}`;
    const item = {
      id,
      factorId: text(row.factorCode ?? row.factorId),
      secondaryFactorId,
      values: stripStepValues(values),
    };
    const prior = existing.itemsByMethod?.[method] ?? [];
    existing.itemsByMethod = {
      ...existing.itemsByMethod,
      [method]: [...prior.filter((row) => row.id !== item.id), item],
    };
    grouped.set(categoryId, existing);
  }

  const entries: Record<number, CategoryEntry> = {};
  for (const category of SCOPE3_CATEGORIES) {
    const loaded = grouped.get(category.id);
    const stored = Object.entries(loaded?.itemsByMethod ?? {}).filter(([, rows]) => rows.length);
    if (loaded && stored.length) {
      const preferred = activeByCategory.get(category.id);
      const method = preferred && loaded.itemsByMethod?.[preferred]?.length ? preferred : stored[stored.length - 1][0];
      entries[category.id] = {
        ...loaded,
        method,
        items: loaded.itemsByMethod?.[method] ?? stored[0][1],
      };
    } else if (categories[category.id] === "included") entries[category.id] = makeEntry(category.id);
  }
  state.entries = entries;

  const firstIncluded = SCOPE3_CATEGORIES.find((category) => categories[category.id] === "included");
  state.activeCategoryId = firstIncluded?.id ?? 1;
  return state;
}
