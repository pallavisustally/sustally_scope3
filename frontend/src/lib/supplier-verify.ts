import { fieldsFor, itemLabel } from "@/data/fields";
import { SCOPE3_CATEGORIES } from "@/data/protocol";
import type { ActivityItem, InventoryState } from "@/lib/inventory-types";

export const VERIFICATION_VALUE_KEYS = [
  "supplierVerified",
  "supplierVerifiedAt",
  "supplierVerificationStatus",
  "supplierVerificationId",
] as const;

export type SupplierVerificationStatus = "pending" | "verified" | "superseded" | "stale" | "";

export type StoredSupplierVerification = {
  id: string;
  companyId: string;
  tokenHash: string;
  tokenSuffix: string;
  status: "pending" | "verified" | "superseded";
  clientItemId: string;
  categoryId: number;
  method: string;
  supplierEmail: string;
  supplierName: string;
  itemLabel: string;
  sentHash: string;
  snapshot: Record<string, string>;
  confirmedValues: Record<string, string> | null;
  edited: boolean;
  verifiedAt: string | null;
};

export function canVerifySupplierMethod(method: string) {
  return method === "supplier-specific" || method === "hybrid";
}

export function isSupplierVerified(values: Record<string, string> | undefined) {
  return values?.supplierVerified === "1" || values?.supplierVerificationStatus === "verified";
}

export function verificationStatus(values: Record<string, string> | undefined): SupplierVerificationStatus {
  if (isSupplierVerified(values)) return "verified";
  const status = values?.supplierVerificationStatus ?? "";
  if (status === "pending" || status === "stale" || status === "superseded") return status;
  return "";
}

export function isValidSupplierEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function activityValuesHash(values: Record<string, string>) {
  const cleaned = Object.fromEntries(
    Object.entries(values)
      .filter(([key]) => !key.startsWith("__") && !VERIFICATION_VALUE_KEYS.includes(key as (typeof VERIFICATION_VALUE_KEYS)[number]))
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, value]) => [key, value.trim()]),
  );
  return JSON.stringify(cleaned);
}

export function publicActivityFields(categoryId: number, method: string) {
  return fieldsFor(categoryId, method).filter((field) => field.id !== "supplierEmail");
}

export function categoryName(categoryId: number) {
  return SCOPE3_CATEGORIES.find((row) => row.id === categoryId)?.name ?? `Category ${categoryId}`;
}

export function sanitizePublicValues(
  categoryId: number,
  method: string,
  incoming: Record<string, unknown>,
  current: Record<string, string>,
) {
  const allowed = new Set(publicActivityFields(categoryId, method).map((field) => field.id));
  const next = { ...current };
  for (const [key, value] of Object.entries(incoming)) {
    if (!allowed.has(key)) continue;
    next[key] = value == null ? "" : String(value);
  }
  return next;
}

export function verificationFlags(input: {
  id: string;
  status: "pending" | "verified" | "superseded";
  supplierEmail: string;
  verifiedAt?: string | null;
}) {
  if (input.status === "verified") {
    return {
      supplierEmail: input.supplierEmail,
      supplierVerified: "1",
      supplierVerifiedAt: input.verifiedAt || new Date().toISOString(),
      supplierVerificationStatus: "verified",
      supplierVerificationId: input.id,
    };
  }
  return {
    supplierEmail: input.supplierEmail,
    supplierVerified: "",
    supplierVerifiedAt: "",
    supplierVerificationStatus: input.status,
    supplierVerificationId: input.id,
  };
}

function hashesMatch(values: Record<string, string>, row: StoredSupplierVerification) {
  const hash = activityValuesHash(values);
  const confirmedHash = row.confirmedValues ? activityValuesHash(row.confirmedValues) : "";
  return hash === row.sentHash || (Boolean(confirmedHash) && hash === confirmedHash);
}

export function overlayVerificationOnValues(values: Record<string, string>, row: StoredSupplierVerification): Record<string, string> {
  if (row.status === "verified" && hashesMatch(values, row)) {
    return {
      ...values,
      ...(row.confirmedValues ?? row.snapshot),
      ...verificationFlags(row),
    };
  }
  if (row.status === "pending" && (activityValuesHash(values) === row.sentHash || !values.supplierVerificationStatus)) {
    return {
      ...values,
      ...verificationFlags(row),
      supplierEmail: values.supplierEmail || row.supplierEmail,
    };
  }
  return values;
}

export function latestVerificationByItem(rows: StoredSupplierVerification[]) {
  const map = new Map<string, StoredSupplierVerification>();
  for (const row of rows) {
    if (row.status === "superseded") continue;
    const current = map.get(row.clientItemId);
    if (!current) {
      map.set(row.clientItemId, row);
      continue;
    }
    if (current.status === "pending") continue;
    if (row.status === "pending" || (row.status === "verified" && current.status !== "verified")) {
      map.set(row.clientItemId, row);
    }
  }
  return map;
}

export function mergeSupplierVerifications(state: InventoryState, rows: StoredSupplierVerification[]): InventoryState {
  if (!rows.length) return state;
  const latest = latestVerificationByItem(rows.filter((row) => row.status !== "superseded"));
  if (latest.size === 0) return state;
  let changed = false;
  const entries = { ...state.entries };
  for (const row of latest.values()) {
    const entry = entries[row.categoryId];
    if (!entry) continue;
    const items = entry.items.map((item) => {
      if (item.id !== row.clientItemId) return item;
      const nextValues = overlayVerificationOnValues(item.values, row);
      if (
        activityValuesHash(nextValues) === activityValuesHash(item.values) &&
        nextValues.supplierVerified === (item.values.supplierVerified || "") &&
        nextValues.supplierVerificationStatus === (item.values.supplierVerificationStatus || "") &&
        nextValues.supplierVerifiedAt === (item.values.supplierVerifiedAt || "") &&
        nextValues.supplierVerificationId === (item.values.supplierVerificationId || "") &&
        nextValues.supplierEmail === (item.values.supplierEmail || "")
      ) {
        return item;
      }
      changed = true;
      return { ...item, values: nextValues };
    });
    if (items !== entry.items) entries[row.categoryId] = { ...entry, items };
  }
  return changed ? { ...state, entries } : state;
}

export function clearVerificationOnEdit(values: Record<string, string>, patch: Record<string, string>): Record<string, string> {
  const next = { ...values, ...patch };
  const keys = Object.keys(patch).filter((key) => !VERIFICATION_VALUE_KEYS.includes(key as (typeof VERIFICATION_VALUE_KEYS)[number]));
  if (!keys.length) return next;
  const status = verificationStatus(values);
  if (!status || status === "stale") return next;
  const emailOnly = keys.length === 1 && keys[0] === "supplierEmail" && patch.supplierEmail === values.supplierEmail;
  if (emailOnly) return next;
  if (keys.length === 1 && keys[0] === "supplierEmail") {
    return {
      ...next,
      supplierVerified: "",
      supplierVerifiedAt: "",
      supplierVerificationStatus: patch.supplierEmail?.trim() ? "stale" : "",
    };
  }
  const activityKeys = keys.filter((key) => key !== "supplierEmail");
  if (!activityKeys.length) return next;
  return {
    ...next,
    supplierVerified: "",
    supplierVerifiedAt: "",
    supplierVerificationStatus: next.supplierEmail?.trim() ? "stale" : "",
  };
}

export function snapshotForItem(item: ActivityItem) {
  const values = Object.fromEntries(
    Object.entries(item.values).filter(
      ([key]) => !key.startsWith("__") && !VERIFICATION_VALUE_KEYS.includes(key as (typeof VERIFICATION_VALUE_KEYS)[number]),
    ),
  );
  return {
    values,
    label: itemLabel(values),
    sentHash: activityValuesHash(values),
  };
}
