"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { EMISSION_FACTORS, type EmissionFactor, type Inclusion } from "@/data/protocol";
import { calculateInventory, type InventoryResult } from "@/lib/calculate";
import { toCollectionDocs, type SavedInventorySummary } from "@/lib/collections-map";
import { emptyInventory, inventoryStorageKey, makeEntry, makeItem, newSessionKey } from "@/lib/inventory-defaults";
import { useCurrentUser } from "./CurrentUser";
import type { CategoryStep, InventoryState } from "@/lib/inventory-types";
import type { AppNotification } from "@/lib/notifications";
import { inventoryNotifications } from "@/lib/notifications";
import { mergeCommuteSurveyItems, type CommuteSurveyItemValues } from "@/lib/commute-survey";
import { clearVerificationOnEdit, mergeSupplierVerifications, type StoredSupplierVerification } from "@/lib/supplier-verify";

export type { ActivityItem, CategoryEntry, CategoryStep, InventoryState } from "@/lib/inventory-types";

function firstIncluded(categories: Record<number, Inclusion>, fallback = 1) {
  const match = Object.entries(categories).find(([, value]) => value === "included");
  return match ? Number(match[0]) : fallback;
}

function applyCategoryInclusion(current: InventoryState, ids: number[], value: Inclusion): InventoryState {
  const categories = { ...current.categories };
  let entries = current.entries;
  for (const id of ids) {
    categories[id] = value;
    if (value === "included" && !entries[id]) {
      entries = { ...entries, [id]: makeEntry(id) };
    }
  }
  const activeCategoryId =
    categories[current.activeCategoryId] === "included"
      ? current.activeCategoryId
      : firstIncluded(categories, current.activeCategoryId);
  return { ...current, categories, entries, activeCategoryId };
}

type InventoryContextValue = {
  state: InventoryState;
  factors: EmissionFactor[];
  results: InventoryResult;
  ready: boolean;
  syncStatus: "idle" | "saving" | "saved" | "error";
  savedInventories: SavedInventorySummary[];
  notices: AppNotification[];
  setState: (patch: Partial<InventoryState>) => void;
  setCategory: (id: number, value: Inclusion) => void;
  setCategories: (ids: number[], value: Inclusion) => void;
  setJustification: (id: number, value: string) => void;
  setActiveCategory: (id: number) => void;
  setCategoryMethod: (id: number, method: string) => void;
  updateItemValues: (categoryId: number, itemId: string, patch: Record<string, string>) => void;
  addItem: (categoryId: number) => void;
  removeItem: (categoryId: number, itemId: string) => void;
  setItemFactor: (categoryId: number, itemId: string, factorId: string) => void;
  setSecondaryFactor: (categoryId: number, itemId: string, factorId: string) => void;
  markCategoryStep: (categoryId: number, step: CategoryStep) => void;
  openInventory: (sessionKey: string) => Promise<void>;
  newInventory: (mode?: "blank" | "next-year") => void;
  refreshInventories: () => Promise<void>;
  pushNotice: (notice: AppNotification) => void;
  applyCommuteSurveyItems: (surveyId: string, items: CommuteSurveyItemValues[]) => void;
};

const InventoryContext = createContext<InventoryContextValue | null>(null);

export function InventoryProvider({ children }: { children: React.ReactNode }) {
  const user = useCurrentUser();
  const userId = user?.id ?? "";
  const [state, setFull] = useState<InventoryState>(() => emptyInventory());
  const [factors, setFactors] = useState<EmissionFactor[]>(EMISSION_FACTORS);
  const [ready, setReady] = useState(false);
  const [syncStatus, setSyncStatus] = useState<InventoryContextValue["syncStatus"]>("idle");
  const [savedInventories, setSavedInventories] = useState<SavedInventorySummary[]>([]);
  const [eventNotices, setEventNotices] = useState<AppNotification[]>([]);
  const skipSave = useRef(true);

  const results = useMemo(() => calculateInventory(state, factors), [state, factors]);

  const rememberSession = useCallback(
    (sessionKey: string) => {
      if (!userId) return;
      window.sessionStorage.setItem(inventoryStorageKey(userId), sessionKey);
    },
    [userId],
  );

  const refreshInventories = useCallback(async () => {
    try {
      const current = userId ? window.sessionStorage.getItem(inventoryStorageKey(userId)) || "" : "";
      const response = await fetch(`/api/inventories?current=${encodeURIComponent(current)}`, { cache: "no-store" });
      const rows = (await response.json()) as SavedInventorySummary[];
      if (Array.isArray(rows)) setSavedInventories(rows);
    } catch {
      setSavedInventories([]);
    }
  }, [userId]);

  const pushNotice = useCallback((notice: AppNotification) => {
    setEventNotices((current) => [notice, ...current.filter((row) => row.id !== notice.id)].slice(0, 8));
  }, []);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    async function boot() {
      const stored = window.sessionStorage.getItem(inventoryStorageKey(userId));
      const sessionKey = stored || newSessionKey();
      rememberSession(sessionKey);
      const [factorRows, inventories, loaded] = await Promise.all([
        fetch("/api/factors", { cache: "no-store" })
          .then((response) => response.json())
          .catch(() => EMISSION_FACTORS),
        fetch(`/api/inventories?current=${encodeURIComponent(stored || "")}`, { cache: "no-store" })
          .then((response) => response.json())
          .catch(() => []),
        fetch(`/api/inventories/${encodeURIComponent(sessionKey)}`, { cache: "no-store" })
          .then((response) => (response.ok ? response.json() : null))
          .catch(() => null),
      ]);
      if (cancelled) return;
      if (Array.isArray(factorRows) && factorRows.length) setFactors(factorRows);
      if (Array.isArray(inventories)) setSavedInventories(inventories);
      skipSave.current = true;
      if (stored && loaded?.sessionKey) {
        setFull(loaded as InventoryState);
      } else {
        const freshKey = stored ? newSessionKey() : sessionKey;
        rememberSession(freshKey);
        setFull({ ...emptyInventory(), sessionKey: freshKey });
      }
      setReady(true);
    }
    void boot();
    return () => {
      cancelled = true;
    };
  }, [pushNotice, rememberSession, userId]);

  useEffect(() => {
    if (!ready || !state.sessionKey) return;
    let cancelled = false;
    async function pull() {
      try {
        const response = await fetch(`/api/supplier-verifications?sessionKey=${encodeURIComponent(state.sessionKey)}`, {
          cache: "no-store",
        });
        const payload = (await response.json().catch(() => ({}))) as { verifications?: StoredSupplierVerification[] };
        if (cancelled || !Array.isArray(payload.verifications)) return;
        setFull((current) => mergeSupplierVerifications(current, payload.verifications ?? []));
      } catch {
        /* keep local state */
      }
    }
    void pull();
    const timer = window.setInterval(() => void pull(), 12000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [ready, state.sessionKey]);

  useEffect(() => {
    if (!ready) return;
    if (skipSave.current) {
      skipSave.current = false;
      return;
    }
    const timer = window.setTimeout(() => {
      setSyncStatus("saving");
      void fetch("/api/collections", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          toCollectionDocs(state, {
            totalTco2e: results.totalTco2e,
            byCategory: results.categories.map((category) => ({
              id: category.id,
              name: category.name,
              method: category.methodLabel,
              formula: category.methodFormula,
              tco2e: category.tco2e,
              share: category.share,
              completeCount: category.completeCount,
              items: category.items.map((item) => ({
                label: item.label,
                tco2e: item.tco2e,
                complete: item.complete,
                steps: item.steps,
              })),
            })),
            dataQualityPct: results.dataQualityPct,
          }),
        ),
      })
        .then(async (response) => {
          const payload = (await response.json()) as { payload?: boolean; reason?: string };
          if (payload.payload) {
            setSyncStatus("saved");
            void refreshInventories();
          } else if (payload.reason === "empty") {
            setSyncStatus("idle");
          } else {
            setSyncStatus("error");
            pushNotice({
              id: "sync-error",
              title: "Could not save report",
              body: "The report is still in this browser session. Totals still calculate from the data you entered.",
              tone: "warn",
            });
          }
        })
        .catch(() => {
          setSyncStatus("error");
        });
    }, 350);
    return () => window.clearTimeout(timer);
  }, [state, ready, results, refreshInventories, pushNotice]);

  const openInventory = useCallback(
    async (sessionKey: string) => {
      const response = await fetch(`/api/inventories/${encodeURIComponent(sessionKey)}`, { cache: "no-store" });
      if (!response.ok) {
        pushNotice({
          id: "open-failed",
          title: "Could not open report",
          body: "Payload did not return that company. It may have been deleted in admin.",
          tone: "warn",
        });
        return;
      }
      const loaded = (await response.json()) as InventoryState;
      rememberSession(sessionKey);
      skipSave.current = true;
      setFull(loaded);
      pushNotice({
        id: "opened-inventory",
        title: loaded.year ? `${loaded.year} opened` : "Report opened",
        body: `${loaded.companyName || "Untitled company"} is in the workspace. Use the sidebar to move through setup, categories, and results.`,
        href: "/dashboard",
        tone: "ok",
      });
    },
    [pushNotice, rememberSession],
  );

  const newInventory = useCallback((mode: "blank" | "next-year" = "blank") => {
    skipSave.current = true;
    setSyncStatus("idle");
    setFull((current) => {
      const nextKey = newSessionKey();
      rememberSession(nextKey);
      const next = { ...emptyInventory(), sessionKey: nextKey };
      if (mode === "next-year") {
        next.companyName = current.companyName;
        next.industry = current.industry;
        next.hq = current.hq;
        next.boundary = current.boundary;
      }
      return next;
    });
    pushNotice({
      id: "new-inventory",
      title: mode === "next-year" ? "New year started" : "New report started",
      body:
        mode === "next-year"
          ? "Company details were kept. Choose the reporting year, then select the categories that apply."
          : "Company, categories, and activity data start empty. Save begins when you add a company or include a category.",
      href: "/company",
      tone: "info",
    });
  }, [pushNotice, rememberSession]);

  const derivedNotices = useMemo(() => inventoryNotifications(state, results), [state, results]);
  const notices = useMemo(() => {
    const seen = new Set(eventNotices.map((row) => row.id));
    return [...eventNotices, ...derivedNotices.filter((row) => !seen.has(row.id))];
  }, [derivedNotices, eventNotices]);

  const value = useMemo(
    () => ({
      state,
      factors,
      results,
      ready,
      syncStatus,
      savedInventories,
      notices,
      setState: (patch: Partial<InventoryState>) => setFull((current) => ({ ...current, ...patch })),
      setCategory: (id: number, value: Inclusion) =>
        setFull((current) => applyCategoryInclusion(current, [id], value)),
      setCategories: (ids: number[], value: Inclusion) =>
        setFull((current) => applyCategoryInclusion(current, ids, value)),
      setJustification: (id: number, value: string) =>
        setFull((current) => ({ ...current, justifications: { ...current.justifications, [id]: value } })),
      setActiveCategory: (id: number) => setFull((current) => ({ ...current, activeCategoryId: id })),
      setCategoryMethod: (id: number, method: string) =>
        setFull((current) => {
          const entry = current.entries[id] ?? makeEntry(id);
          const items =
            id === 7 && method === "average-data"
              ? entry.items.map((item) => ({
                  ...item,
                  values: {
                    ...item.values,
                    headcount: item.values.headcount || item.values.employees,
                  },
                }))
              : entry.items;
          return {
            ...current,
            entries: {
              ...current.entries,
              [id]: { ...entry, method, items },
            },
          };
        }),
      updateItemValues: (categoryId: number, itemId: string, patch: Record<string, string>) =>
        setFull((current) => {
          const entry = current.entries[categoryId] ?? makeEntry(categoryId);
          return {
            ...current,
            entries: {
              ...current.entries,
              [categoryId]: {
                ...entry,
                items: entry.items.map((item) =>
                  item.id === itemId ? { ...item, values: clearVerificationOnEdit(item.values, patch) } : item,
                ),
              },
            },
          };
        }),
      addItem: (categoryId: number) =>
        setFull((current) => {
          const entry = current.entries[categoryId] ?? makeEntry(categoryId);
          const nextIndex =
            entry.items.reduce((max, item) => {
              const n = Number(item.id.split("-").pop());
              return Number.isFinite(n) ? Math.max(max, n) : max;
            }, 0) + 1;
          return {
            ...current,
            entries: {
              ...current.entries,
              [categoryId]: {
                ...entry,
                items: [...entry.items, makeItem(categoryId, nextIndex)],
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
      setSecondaryFactor: (categoryId: number, itemId: string, factorId: string) =>
        setFull((current) => {
          const entry = current.entries[categoryId] ?? makeEntry(categoryId);
          return {
            ...current,
            entries: {
              ...current.entries,
              [categoryId]: {
                ...entry,
                items: entry.items.map((item) => (item.id === itemId ? { ...item, secondaryFactorId: factorId } : item)),
              },
            },
          };
        }),
      markCategoryStep: (categoryId: number, step: CategoryStep) =>
        setFull((current) => {
          const entry = current.entries[categoryId] ?? makeEntry(categoryId);
          return {
            ...current,
            entries: {
              ...current.entries,
              [categoryId]: { ...entry, [`${step}Done`]: true },
            },
          };
        }),
      openInventory,
      newInventory,
      refreshInventories,
      pushNotice,
      applyCommuteSurveyItems: (surveyId: string, items: CommuteSurveyItemValues[]) =>
        setFull((current) => mergeCommuteSurveyItems(current, surveyId, items)),
    }),
    [state, factors, results, ready, syncStatus, savedInventories, notices, openInventory, newInventory, refreshInventories, pushNotice],
  );

  return <InventoryContext.Provider value={value}>{children}</InventoryContext.Provider>;
}

export function useInventory() {
  const ctx = useContext(InventoryContext);
  if (!ctx) throw new Error("useInventory must be used within InventoryProvider");
  return ctx;
}
