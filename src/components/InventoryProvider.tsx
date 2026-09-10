"use client";

import { createContext, useContext, useMemo, useState } from "react";
import { blankValues, SAMPLE_ITEM_VALUES, SAMPLE_METHODS } from "@/data/fields";
import { defaultFactorId, SCOPE3_CATEGORIES, type Inclusion } from "@/data/protocol";

export type ActivityItem = {
  id: string;
  values: Record<string, string>;
  factorId: string;
};

export type CategoryEntry = {
  method: string;
  items: ActivityItem[];
};

export type InventoryState = {
  companyName: string;
  industry: string;
  year: string;
  hq: string;
  boundary: "operational" | "financial" | "equity";
  categories: Record<number, Inclusion>;
  justifications: Record<number, string>;
  activeCategoryId: number;
  entries: Record<number, CategoryEntry>;
};

function makeItem(categoryId: number, index = 1, values?: Record<string, string>): ActivityItem {
  return {
    id: `c${categoryId}-${index}`,
    factorId: defaultFactorId(categoryId),
    values: { ...blankValues(categoryId), ...values },
  };
}

function makeEntry(categoryId: number): CategoryEntry {
  return {
    method: SAMPLE_METHODS[categoryId] ?? "average-data",
    items: [makeItem(categoryId, 1, SAMPLE_ITEM_VALUES[categoryId])],
  };
}

function buildEntries(): Record<number, CategoryEntry> {
  return Object.fromEntries(SCOPE3_CATEGORIES.map((category) => [category.id, makeEntry(category.id)]));
}

const defaults: InventoryState = {
  companyName: "Acme Corporation",
  industry: "Manufacturing",
  year: "2024",
  hq: "Bengaluru, India",
  boundary: "operational",
  categories: {
    1: "included",
    2: "included",
    3: "included",
    4: "included",
    5: "included",
    6: "included",
    7: "included",
    8: "not_applicable",
    9: "included",
    10: "excluded",
    11: "included",
    12: "included",
    13: "not_applicable",
    14: "not_applicable",
    15: "excluded",
  },
  justifications: {
    8: "No upstream leased assets in the reporting year.",
    10: "Sold products are final goods; no downstream processing.",
    13: "The company does not lease assets to other entities.",
    14: "The company does not operate a franchise model.",
    15: "No investments outside the organizational boundary.",
  },
  activeCategoryId: 1,
  entries: buildEntries(),
};

function firstIncluded(categories: Record<number, Inclusion>, fallback = 1) {
  const match = SCOPE3_CATEGORIES.find((category) => categories[category.id] === "included");
  return match?.id ?? fallback;
}

const InventoryContext = createContext<{
  state: InventoryState;
  setState: (patch: Partial<InventoryState>) => void;
  setCategory: (id: number, value: Inclusion) => void;
  setJustification: (id: number, value: string) => void;
  setActiveCategory: (id: number) => void;
  setCategoryMethod: (id: number, method: string) => void;
  updateItemValues: (categoryId: number, itemId: string, patch: Record<string, string>) => void;
  addItem: (categoryId: number) => void;
  removeItem: (categoryId: number, itemId: string) => void;
  setItemFactor: (categoryId: number, itemId: string, factorId: string) => void;
} | null>(null);

export function InventoryProvider({ children }: { children: React.ReactNode }) {
  const [state, setFull] = useState(defaults);
  const value = useMemo(
    () => ({
      state,
      setState: (patch: Partial<InventoryState>) => setFull((current) => ({ ...current, ...patch })),
      setCategory: (id: number, value: Inclusion) =>
        setFull((current) => {
          const categories = { ...current.categories, [id]: value };
          const entries = current.entries[id] ? current.entries : { ...current.entries, [id]: makeEntry(id) };
          const activeCategoryId =
            categories[current.activeCategoryId] === "included" ? current.activeCategoryId : firstIncluded(categories, current.activeCategoryId);
          return { ...current, categories, entries, activeCategoryId };
        }),
      setJustification: (id: number, value: string) =>
        setFull((current) => ({ ...current, justifications: { ...current.justifications, [id]: value } })),
      setActiveCategory: (id: number) => setFull((current) => ({ ...current, activeCategoryId: id })),
      setCategoryMethod: (id: number, method: string) =>
        setFull((current) => ({
          ...current,
          entries: {
            ...current.entries,
            [id]: { ...(current.entries[id] ?? makeEntry(id)), method },
          },
        })),
      updateItemValues: (categoryId: number, itemId: string, patch: Record<string, string>) =>
        setFull((current) => {
          const entry = current.entries[categoryId] ?? makeEntry(categoryId);
          return {
            ...current,
            entries: {
              ...current.entries,
              [categoryId]: {
                ...entry,
                items: entry.items.map((item) => (item.id === itemId ? { ...item, values: { ...item.values, ...patch } } : item)),
              },
            },
          };
        }),
      addItem: (categoryId: number) =>
        setFull((current) => {
          const entry = current.entries[categoryId] ?? makeEntry(categoryId);
          return {
            ...current,
            entries: {
              ...current.entries,
              [categoryId]: {
                ...entry,
                items: [...entry.items, makeItem(categoryId, entry.items.length + 1)],
              },
            },
          };
        }),
      removeItem: (categoryId: number, itemId: string) =>
        setFull((current) => {
          const entry = current.entries[categoryId] ?? makeEntry(categoryId);
          if (entry.items.length <= 1) return current;
          return {
            ...current,
            entries: {
              ...current.entries,
              [categoryId]: { ...entry, items: entry.items.filter((item) => item.id !== itemId) },
            },
          };
        }),
      setItemFactor: (categoryId: number, itemId: string, factorId: string) =>
        setFull((current) => {
          const entry = current.entries[categoryId] ?? makeEntry(categoryId);
          return {
            ...current,
            entries: {
              ...current.entries,
              [categoryId]: {
                ...entry,
                items: entry.items.map((item) => (item.id === itemId ? { ...item, factorId } : item)),
              },
            },
          };
        }),
    }),
    [state],
  );
  return <InventoryContext.Provider value={value}>{children}</InventoryContext.Provider>;
}

export function useInventory() {
  const ctx = useContext(InventoryContext);
  if (!ctx) throw new Error("useInventory must be used within InventoryProvider");
  return ctx;
}
