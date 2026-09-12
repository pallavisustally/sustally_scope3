import { type ActivityField, fieldsFor } from "@/data/fields";
import type { ActivityItem, CategoryEntry } from "@/lib/inventory-types";
import { parseAmount } from "@/lib/numbers";

const NUMBER_FIELDS = new Set([
  "quantity",
  "spend",
  "fuelQuantity",
  "cargoMass",
  "distance",
  "trips",
  "employeesSurveyed",
  "employees",
  "oneWayKm",
  "commutingDays",
  "headcount",
  "officeDaysPerWeek",
  "energyQuantity",
  "floorArea",
  "productMass",
  "productQuantity",
  "sites",
  "unitsSold",
  "lifetimeYears",
  "intensity",
  "usesPerYear",
  "indirectIntensity",
  "mass",
  "percentToTreatment",
  "numberOfFranchises",
  "floorAreaPerSite",
  "equityShare",
  "investeeScope1",
  "investeeScope2",
  "investmentValue",
  "primarySharePct",
  "fxRate",
  "biogenicTco2e",
  "yearAcquired",
]);

const TEXT_FIELDS = new Set([
  "item",
  "description",
  "supplier",
  "supplierProduct",
  "energyCarrier",
  "origin",
  "destination",
  "treatmentProvider",
  "assetName",
  "lessorName",
  "siteName",
  "productName",
  "processorName",
  "franchiseeName",
  "investeeName",
  "lessee",
  "gridRegion",
  "region",
  "vehicleType",
  "eolRegion",
]);

const PERCENT_FIELDS = new Set(["primarySharePct", "percentToTreatment", "equityShare"]);
const NUMBER_ONLY = /^-?\d+(?:\.\d+)?$/;

export function isRequiredField(field: ActivityField) {
  return Boolean(field.required) && !field.optional;
}

export function isNumberField(field: ActivityField) {
  return field.type !== "select" && NUMBER_FIELDS.has(field.id);
}

export function isTextField(field: ActivityField) {
  return field.type !== "select" && TEXT_FIELDS.has(field.id);
}

function skipEmptyRequired(field: ActivityField, method: string, values: Record<string, string>) {
  if (field.id === "biogenicTco2e" || field.id === "fxRate") return true;
  if (method !== "hybrid") return false;
  const share = parseAmount(values.primarySharePct);
  if (field.id === "quantity" || field.id === "unit") return share === 0;
  if (field.id === "spend" || field.id === "currency") return share === 100;
  return false;
}

export function validateField(field: ActivityField, value: string, method: string, values: Record<string, string>): string | null {
  const trimmed = value.trim();
  const required = isRequiredField(field) && !skipEmptyRequired(field, method, values);

  if (!trimmed) return required ? `${field.label} is required` : null;

  if (isNumberField(field) || (field.type === "text" && NUMBER_FIELDS.has(field.id))) {
    const amount = parseAmount(trimmed);
    if (amount == null || !NUMBER_ONLY.test(trimmed.replace(/,/g, ""))) {
      return `Enter a number for ${field.label.toLowerCase()}, not text`;
    }
    if (PERCENT_FIELDS.has(field.id) && (amount < 0 || amount > 100)) {
      return `${field.label} must be between 0 and 100`;
    }
    if (field.id === "yearAcquired" && (amount < 1900 || amount > 2100 || !Number.isInteger(amount))) {
      return "Enter a valid year";
    }
    if (field.id !== "fxRate" && amount < 0) return `${field.label} cannot be negative`;
    return null;
  }

  if (isTextField(field) && NUMBER_ONLY.test(trimmed.replace(/,/g, ""))) {
    return `${field.label} must be text, not a number`;
  }

  return null;
}

export function validateItemValues(fields: ActivityField[], values: Record<string, string>, method: string) {
  const errors: Record<string, string> = {};
  for (const field of fields) {
    const message = validateField(field, values[field.id] ?? "", method, values);
    if (message) errors[field.id] = message;
  }
  return errors;
}

export function validateActivityItems(categoryId: number, method: string, items: ActivityItem[]) {
  const fields = fieldsFor(categoryId, method);
  return items.map((item, index) => ({
    id: item.id,
    index,
    errors: validateItemValues(fields, item.values, method),
  }));
}

export function activityHasErrors(categoryId: number, method: string, items: ActivityItem[]) {
  return validateActivityItems(categoryId, method, items).some((row) => Object.keys(row.errors).length > 0);
}

export function activityErrorSummary(categoryId: number, method: string, items: ActivityItem[]) {
  const rows = validateActivityItems(categoryId, method, items);
  const messages: string[] = [];
  for (const row of rows) {
    const labels = Object.values(row.errors);
    if (!labels.length) continue;
    messages.push(`Item ${row.index + 1}: ${labels.join("; ")}`);
  }
  return messages;
}

export function hybridFactorNeeds(item: ActivityItem) {
  const share = parseAmount(item.values.primarySharePct);
  return {
    supplier: share == null || share > 0,
    secondary: share == null || share < 100,
  };
}

export function methodNeedsFactor(categoryId: number, method: string) {
  return !(categoryId === 15 && method === "investment-specific");
}

export function factorsReady(entry: CategoryEntry, categoryId?: number) {
  if (categoryId != null && !methodNeedsFactor(categoryId, entry.method)) return true;
  if (entry.method !== "hybrid") return entry.items.every((item) => Boolean(item.factorId));
  return entry.items.every((item) => {
    const needs = hybridFactorNeeds(item);
    if (needs.supplier && !item.factorId) return false;
    if (needs.secondary && !item.secondaryFactorId) return false;
    return true;
  });
}

export function factorGaps(entry: CategoryEntry, categoryId?: number) {
  if (categoryId != null && !methodNeedsFactor(categoryId, entry.method)) return [];
  return entry.items.flatMap((item, index) => {
    const missing: string[] = [];
    if (entry.method === "hybrid") {
      const needs = hybridFactorNeeds(item);
      if (needs.supplier && !item.factorId) missing.push("a supplier-specific factor");
      if (needs.secondary && !item.secondaryFactorId) {
        missing.push("a secondary factor for the remaining share (switch the bind slot, then pick another row)");
      }
    } else if (!item.factorId) {
      missing.push("an emission factor");
    }
    return missing.length ? [`Item ${index + 1} needs ${missing.join(" and ")}`] : [];
  });
}
