import { blankValues } from "@/data/fields";
import { EMISSION_FACTORS, type EmissionFactor } from "@/data/protocol";
import { makeEntry, makeItem } from "@/lib/inventory-defaults";
import { switchCategoryMethod } from "@/lib/inventory-method";
import type { ActivityItem, CategoryEntry, InventoryState } from "@/lib/inventory-types";

export const COMMUTE_MODES = ["Car", "Two-wheeler", "Bus", "Metro / rail", "Walk / cycle"] as const;
export const WORKPLACE_TYPES = ["Fully remote", "Hybrid", "A workplace"] as const;
export const WFH_GROUP = "Work from home / no commute";
export const DEFAULT_WEEKS_PER_YEAR = 48;

/** DEFRA 2024 passenger / land commuting factors, plus zero for walk, cycle, and WFH. */
export const COMMUTE_MODE_FACTOR_IDS: Record<string, string> = {
  Car: "c7-car",
  "Two-wheeler": "c7-two-wheeler",
  Bus: "c7-bus",
  "Metro / rail": "c7-metro",
  "Walk / cycle": "c7-walk-cycle",
  [WFH_GROUP]: "c7-wfh",
};

export type CommuteMode = (typeof COMMUTE_MODES)[number];

export type CommuteResponseRecord = {
  commuteDays: number;
  wfhDays: number;
  offDays: number;
  mode?: string | null;
  oneWayKm?: number | null;
};

export type CommuteSurveyItemValues = {
  item: string;
  mode: string;
  employees: string;
  oneWayKm: string;
  commutingDays: string;
  employeesSurveyed: string;
  surveyId: string;
  region?: string;
};

export type CommuteSurveyStats = {
  responseCount: number;
  commuteCount: number;
  wfhCount: number;
  wfhSharePct: number;
  byMode: { mode: string; count: number }[];
};

function asQty(value: number) {
  if (!Number.isFinite(value) || value <= 0) return "0";
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

function mean(values: number[]) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function isCommuteMode(value: string): value is CommuteMode {
  return (COMMUTE_MODES as readonly string[]).includes(value);
}

export function commuteGroupKey(mode: string) {
  const value = mode.trim();
  return value && value !== WFH_GROUP ? value : WFH_GROUP;
}

export function commuteFactorIdForMode(mode: string) {
  const value = mode.trim();
  if (!value) return "";
  return COMMUTE_MODE_FACTOR_IDS[value] ?? "";
}

export function commuteModeLabel(mode: string) {
  return mode.trim() || WFH_GROUP;
}

function isDistanceFactor(factor: EmissionFactor) {
  const per = factor.unit.split("/")[1]?.trim().toLowerCase() ?? "";
  return per === "km" || per === "pkm";
}

function isFuelFactor(factor: EmissionFactor) {
  const per = factor.unit.split("/")[1]?.trim().toLowerCase() ?? "";
  return per === "litre" || per === "kwh" || per === "kg";
}

function isAverageFactor(factor: EmissionFactor) {
  return /employee/i.test(factor.unit) || factor.id === "c7-avg";
}

export function factorsForCommuteItem(
  method: string,
  mode: string,
  catalog: EmissionFactor[] = EMISSION_FACTORS,
): EmissionFactor[] {
  const ids = new Set(catalog.map((row) => row.id));
  const merged = [...catalog, ...EMISSION_FACTORS.filter((row) => row.categories.includes(7) && !ids.has(row.id))];
  const all = merged.filter((row) => row.categories.includes(7));
  if (method === "fuel-based") {
    const rows = all.filter(isFuelFactor);
    return rows.length ? rows : all;
  }
  if (method === "average-data") {
    const rows = all.filter(isAverageFactor);
    return rows.length ? rows : all;
  }
  const distance = all.filter(isDistanceFactor);
  const preferredId = commuteFactorIdForMode(mode);
  const preferred = distance.find((row) => row.id === preferredId);
  const rest = distance.filter((row) => row.id !== preferredId);
  const ordered = preferred ? [preferred, ...rest] : distance;
  return ordered.length ? ordered : all;
}

export function surveyIsClosed(status: string, closeAt?: string | null) {
  if (status === "closed") return true;
  if (!closeAt) return false;
  const when = new Date(closeAt).getTime();
  return Number.isFinite(when) && when <= Date.now();
}

export function validateCommuteResponse(input: {
  commuteDays: unknown;
  wfhDays: unknown;
  offDays: unknown;
  mode?: unknown;
  oneWayKm?: unknown;
  region?: unknown;
  workplaceType?: unknown;
}) {
  const commuteDays = Number(input.commuteDays);
  const wfhDays = Number(input.wfhDays);
  const offDays = Number(input.offDays);
  if (![commuteDays, wfhDays, offDays].every((value) => Number.isInteger(value) && value >= 0 && value <= 7)) {
    return { error: "Enter whole days from 0 to 7 for commute, work from home, and days off." };
  }
  if (commuteDays + wfhDays + offDays !== 7) {
    return { error: "Commute, work from home, and days off must add up to 7." };
  }
  const mode = String(input.mode ?? "").trim();
  const region = String(input.region ?? "").trim();
  let workplaceType = String(input.workplaceType ?? "").trim();
  if (workplaceType && !(WORKPLACE_TYPES as readonly string[]).includes(workplaceType) && !workplaceType.startsWith("A workplace")) {
    return { error: "Choose a workplace type." };
  }
  if (commuteDays > 0) {
    if (!isCommuteMode(mode)) return { error: "Choose the main way you travel to work." };
    const oneWayKm = Number(input.oneWayKm);
    if (!Number.isFinite(oneWayKm) || oneWayKm <= 0) return { error: "Enter a one-way distance greater than 0 km." };
    return {
      value: {
        commuteDays,
        wfhDays,
        offDays,
        mode,
        oneWayKm,
        region,
        workplaceType,
      },
    };
  }
  if (mode && !isCommuteMode(mode)) return { error: "Choose a listed travel mode, or leave it blank if you did not commute." };
  const oneWayKm = input.oneWayKm === "" || input.oneWayKm == null ? null : Number(input.oneWayKm);
  if (oneWayKm != null && (!Number.isFinite(oneWayKm) || oneWayKm < 0)) {
    return { error: "One-way distance cannot be negative." };
  }
  if (workplaceType === "A workplace") workplaceType = "A workplace";
  return {
    value: {
      commuteDays,
      wfhDays,
      offDays,
      mode: mode || "",
      oneWayKm,
      region,
      workplaceType,
    },
  };
}

export function commuteSurveyStats(responses: CommuteResponseRecord[]): CommuteSurveyStats {
  const responseCount = responses.length;
  const commuteCount = responses.filter((row) => row.commuteDays > 0).length;
  const wfhCount = responseCount - commuteCount;
  const byModeMap = new Map<string, number>();
  for (const row of responses) {
    const key = row.commuteDays > 0 ? row.mode || "Unspecified" : WFH_GROUP;
    byModeMap.set(key, (byModeMap.get(key) ?? 0) + 1);
  }
  return {
    responseCount,
    commuteCount,
    wfhCount,
    wfhSharePct: responseCount ? (wfhCount / responseCount) * 100 : 0,
    byMode: [...byModeMap.entries()].map(([mode, count]) => ({ mode, count })).sort((a, b) => b.count - a.count),
  };
}

export function aggregateCommuteResponses(input: {
  surveyId: string;
  headcount: number;
  weeksPerYear: number;
  responses: CommuteResponseRecord[];
}): { items: CommuteSurveyItemValues[]; stats: CommuteSurveyStats } {
  const stats = commuteSurveyStats(input.responses);
  const weeks = input.weeksPerYear > 0 ? input.weeksPerYear : DEFAULT_WEEKS_PER_YEAR;
  const total = input.responses.length;
  if (!total || input.headcount <= 0) return { items: [], stats };

  const groups = new Map<string, CommuteResponseRecord[]>();
  for (const row of input.responses) {
    const key = row.commuteDays > 0 ? `mode:${row.mode || "Unspecified"}` : "wfh";
    const list = groups.get(key) ?? [];
    list.push(row);
    groups.set(key, list);
  }

  const items: CommuteSurveyItemValues[] = [];
  for (const [key, rows] of groups) {
    const n = rows.length;
    if (key === "wfh") {
      items.push({
        surveyId: input.surveyId,
        item: `Survey: ${WFH_GROUP}`,
        mode: WFH_GROUP,
        employees: asQty(n),
        oneWayKm: "0",
        commutingDays: "0",
        employeesSurveyed: String(n),
      });
      continue;
    }
    const mode = rows[0]?.mode || "";
    const kmValues = rows.map((row) => Number(row.oneWayKm)).filter((value) => Number.isFinite(value) && value > 0);
    items.push({
      surveyId: input.surveyId,
      item: `Survey: ${mode || "Unspecified"}`,
      mode,
      employees: asQty(n),
      oneWayKm: asQty(mean(kmValues)),
      commutingDays: asQty(mean(rows.map((row) => row.commuteDays)) * weeks),
      employeesSurveyed: String(n),
    });
  }

  items.sort((a, b) => {
    const aWfh = commuteGroupKey(a.mode) === WFH_GROUP;
    const bWfh = commuteGroupKey(b.mode) === WFH_GROUP;
    if (aWfh !== bWfh) return aWfh ? 1 : -1;
    return Number(b.employees) - Number(a.employees);
  });
  return { items, stats };
}

export function isSurveyActivityItem(item: ActivityItem) {
  return Boolean(item.values.surveyId?.trim());
}

export function isDefaultCommutePlaceholder(item: ActivityItem) {
  if (isSurveyActivityItem(item)) return false;
  return item.id === "c7-1" || /^c7-(distance-based|fuel-based|average-data)-1$/.test(item.id);
}

export function commuteSourceOf(entry: CategoryEntry): "survey" | "manual" | "" {
  if (entry.method !== "distance-based") return "";
  if (entry.commuteSource === "survey" || entry.commuteSource === "manual") return entry.commuteSource;
  if (entry.items.some(isSurveyActivityItem)) return "survey";
  return "";
}

export function itemsForCommuteCalc(entry: CategoryEntry) {
  const source = commuteSourceOf(entry);
  if (source === "manual") return entry.items.filter((item) => !isSurveyActivityItem(item));
  if (source === "survey") {
    if (entry.commuteRemainder === "manual") return entry.items;
    return entry.items.filter(isSurveyActivityItem);
  }
  return entry.items;
}

export function scaledCommuteEmployees(responsesInMode: number, headcount: number, responseCount: number) {
  const total = responseCount > 0 ? responseCount : 1;
  if (headcount <= 0) return responsesInMode;
  return headcount * (responsesInMode / total);
}

export function proportionalWorkingRows(
  items: ActivityItem[],
  headcount: number,
  responseCount: number,
) {
  return items.filter(isSurveyActivityItem).map((item) => {
    const responses = Number(item.values.employeesSurveyed) || 0;
    return {
      mode: commuteModeLabel(item.values.mode || ""),
      responses,
      employees: asQty(scaledCommuteEmployees(responses, headcount, responseCount)),
    };
  });
}

export function applySurveyRemainder(
  items: ActivityItem[],
  remainder: "proportional" | "manual" | "responses-only",
  headcount: number,
  responseCount: number,
): ActivityItem[] {
  return items.map((item) => {
    if (!isSurveyActivityItem(item)) return item;
    const n = Number(item.values.employeesSurveyed) || 0;
    const employees =
      remainder === "proportional" ? asQty(scaledCommuteEmployees(n, headcount, responseCount)) : asQty(n);
    return { ...item, values: { ...item.values, employees } };
  });
}

export function mergeCommuteSurveyItems(
  state: InventoryState,
  surveyId: string,
  rows: CommuteSurveyItemValues[],
  headcount = 0,
): InventoryState {
  const current = switchCategoryMethod(state.entries[7] ?? makeEntry(7), 7, "distance-based");
  const previousSurvey = current.items.filter((item) => item.values.surveyId === surveyId);
  const remainder = current.commuteRemainder;
  const extraGroups = current.items.filter((item) => {
    if (isSurveyActivityItem(item)) return false;
    if (remainder === "manual") return true;
    if (isDefaultCommutePlaceholder(item)) {
      return Boolean(
        item.values.item?.trim() ||
          item.values.employees?.trim() ||
          item.values.headcount?.trim() ||
          item.values.fuelQuantity?.trim(),
      );
    }
    return true;
  });
  let nextItems: ActivityItem[] = [
    ...rows.map((row, index) => {
      const prior = previousSurvey.find(
        (item) => commuteGroupKey(item.values.mode || "") === commuteGroupKey(row.mode),
      );
      const item = prior ?? makeItem(7, 1000 + index, "distance-based");
      const defaultFactorId = commuteFactorIdForMode(row.mode);
      return {
        ...item,
        id: prior?.id ?? `c7-survey-${surveyId.slice(-6)}-${index + 1}`,
        factorId: item.factorId || defaultFactorId,
        values: {
          ...blankValues(7),
          ...item.values,
          item: row.item,
          mode: row.mode,
          employees: row.employees,
          oneWayKm: row.oneWayKm,
          commutingDays: row.commutingDays,
          employeesSurveyed: row.employeesSurveyed,
          surveyId,
        },
      };
    }),
    ...extraGroups,
  ];
  const responseCount = rows.reduce((sum, row) => sum + (Number(row.employeesSurveyed) || 0), 0);
  if (remainder) {
    nextItems = applySurveyRemainder(nextItems, remainder, headcount, responseCount);
    if (remainder === "manual" && !nextItems.some((item) => !isSurveyActivityItem(item))) {
      nextItems = [...nextItems, makeItem(7, nextItems.length + 1, "distance-based")];
    }
  }
  return {
    ...state,
    categories: { ...state.categories, 7: "included" },
    activeCategoryId: 7,
    entries: {
      ...state.entries,
      7: {
        ...current,
        method: "distance-based",
        commuteSource: "survey",
        commuteRemainder: remainder,
        methodDone: true,
        activityDone: true,
        items: nextItems.length ? nextItems : [makeItem(7, 1, "distance-based")],
      },
    },
  };
}
