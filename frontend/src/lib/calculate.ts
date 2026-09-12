import { fieldsFor, itemLabel } from "@/data/fields";
import { formulaFor } from "@/data/formulas";
import { EMISSION_FACTORS, SCOPE3_CATEGORIES, type EmissionFactor } from "@/data/protocol";
import { aggregateDqa, dqaPercent, scoreItemDqa, type DqaScores } from "@/lib/data-quality";
import { convertSpend, factorCurrency, isSpendFactor } from "@/lib/fx";
import type { ActivityItem, InventoryState } from "@/lib/inventory-types";
import {
  factorDenominator,
  factorIsTonnes,
  formatTco2e,
  parseAmount,
  toKm,
  toKg,
  toKwh,
  toM2,
  toTonnes,
} from "@/lib/numbers";

export type SpendConversion = {
  from: string;
  to: string;
  rate: number;
  amount: number;
};

export type ItemResult = {
  categoryId: number;
  itemId: string;
  label: string;
  method: string;
  tco2e: number;
  supplierTco2e: number;
  secondaryTco2e: number;
  biogenicTco2e: number;
  complete: boolean;
  missing: string[];
  steps: string[];
  factor?: EmissionFactor;
  secondaryFactor?: EmissionFactor;
  spendConversion?: SpendConversion;
  dqa: DqaScores;
};

export type CategoryResult = {
  id: number;
  name: string;
  stream: "upstream" | "downstream";
  method: string;
  methodLabel: string;
  formula: string;
  methodFormula: string;
  tco2e: number;
  supplierTco2e: number;
  secondaryTco2e: number;
  biogenicTco2e: number;
  share: number;
  items: ItemResult[];
  completeCount: number;
};

export type InventoryResult = {
  totalTco2e: number;
  biogenicTco2e: number;
  supplierTco2e: number;
  secondaryTco2e: number;
  supplierSharePct: number;
  upstreamTco2e: number;
  downstreamTco2e: number;
  categories: CategoryResult[];
  includedCount: number;
  completeItems: number;
  totalItems: number;
  completenessPct: number;
  dataQualityPct: number;
  dqa: DqaScores;
  hasCalculableData: boolean;
};

type CalcContext = {
  catalog: EmissionFactor[];
  reportingYear: string;
  hq: string;
};

function factorById(id: string | undefined, catalog: EmissionFactor[]) {
  if (!id) return undefined;
  return catalog.find((row) => row.id === id);
}

function applyFactor(quantity: number, factor: EmissionFactor): number {
  const value = parseAmount(factor.factor) ?? 0;
  const raw = quantity * value;
  return factorIsTonnes(factor.unit) ? raw : raw / 1000;
}

function factorApplyLine(quantity: number, factor: EmissionFactor, tco2e: number, prefix?: string) {
  const body = factorIsTonnes(factor.unit)
    ? `${formatTco2e(quantity)} × ${factor.factor} ${factor.unit} = ${formatTco2e(tco2e)} tCO₂e`
    : `${formatTco2e(quantity)} × ${factor.factor} ${factor.unit} ÷ 1,000 = ${formatTco2e(tco2e)} tCO₂e`;
  return prefix ? `${prefix}: ${body}` : body;
}

function activityLead(values: Record<string, string>) {
  if (values.cargoMass && values.distance) {
    return `Activity: ${values.cargoMass} ${values.massUnit || "t"} × ${values.distance} ${values.distanceUnit || "km"}`;
  }
  if (values.productMass && values.distance) {
    return `Activity: ${values.productMass} ${values.massUnit || "t"} × ${values.distance} ${values.distanceUnit || "km"}`;
  }
  if (values.employees && values.oneWayKm && values.commutingDays) {
    return `Activity: ${values.employees} employees × ${values.commutingDays} days × 2 × ${values.oneWayKm} km`;
  }
  if (values.unitsSold && values.lifetimeYears) {
    const intensity = values.intensity || values.indirectIntensity;
    const unit = values.intensityUnit || values.indirectUnit || "";
    return `Activity: ${values.unitsSold} units × ${values.lifetimeYears} years × ${intensity || "intensity"} ${unit}`.trim();
  }
  if (values.investeeScope1 && values.investeeScope2) {
    return `Activity: (${values.investeeScope1} + ${values.investeeScope2}) × ${values.equityShare || "?"}% share`;
  }
  if (values.distance) {
    const trips = values.trips ? ` × ${values.trips} trips` : "";
    return `Activity: ${values.distance} ${values.distanceUnit || "km"}${trips}`;
  }
  const qty = values.quantity || values.fuelQuantity || values.energyQuantity || values.spend || values.mass || values.headcount || values.floorArea || values.investmentValue || values.numberOfFranchises;
  const unit = values.unit || values.fuelUnit || values.energyUnit || values.currency || values.massUnit || values.areaUnit || "";
  return qty ? `Activity: ${qty}${unit ? ` ${unit}` : ""}` : null;
}

function convertToDenominator(quantity: number, activityUnit: string, factor: EmissionFactor): number {
  const per = factorDenominator(factor.unit);
  if (per === "kg" || per === "kg co2e") return toKg(quantity, activityUnit);
  if (per.startsWith("tonne") || per === "t") return toTonnes(quantity, activityUnit);
  if (per === "kwh") return toKwh(quantity, activityUnit);
  if (per === "m²" || per === "m2") return toM2(quantity, activityUnit);
  if (per === "km") return toKm(quantity, activityUnit);
  if (per === "pkm" && activityUnit.toLowerCase() === "miles") return toKm(quantity, activityUnit);
  if (per === "tkm" && activityUnit.toLowerCase() === "miles") return toKm(quantity, activityUnit);
  return quantity;
}

function requireNumber(values: Record<string, string>, key: string, label: string, missing: string[]): number | null {
  const n = parseAmount(values[key]);
  if (n == null) {
    missing.push(label);
    return null;
  }
  if (n < 0) {
    missing.push(`${label} cannot be negative`);
    return null;
  }
  return n;
}

const CALC_INPUT_IDS = new Set([
  "quantity",
  "spend",
  "currency",
  "fuelQuantity",
  "cargoMass",
  "distance",
  "employees",
  "oneWayKm",
  "commutingDays",
  "headcount",
  "energyQuantity",
  "floorArea",
  "productMass",
  "productQuantity",
  "unitsSold",
  "lifetimeYears",
  "intensity",
  "indirectIntensity",
  "mass",
  "equityShare",
  "investeeScope1",
  "investeeScope2",
  "investmentValue",
  "primarySharePct",
  "numberOfFranchises",
]);

function requiredFieldGaps(categoryId: number, method: string, values: Record<string, string>): string[] {
  const share = parseAmount(values.primarySharePct);
  return fieldsFor(categoryId, method)
    .filter((field) => field.required && !field.optional && CALC_INPUT_IDS.has(field.id))
    .filter((field) => {
      if (field.id === "biogenicTco2e" || field.id === "fxRate" || field.id === "secondaryFactorId") return false;
      if (method === "hybrid" && (field.id === "spend" || field.id === "currency" || field.id === "fxRate")) return false;
      if (method === "hybrid" && share === 0 && (field.id === "quantity" || field.id === "unit")) return false;
      if (method === "hybrid" && share === 100 && (field.id === "spend" || field.id === "currency")) return false;
      return !values[field.id]?.trim();
    })
    .map((field) => field.label);
}

function quantityForItem(
  categoryId: number,
  method: string,
  values: Record<string, string>,
  factor: EmissionFactor | undefined,
  missing: string[],
): number | null {
  switch (categoryId) {
    case 1:
    case 2:
      if (method === "spend-based") return requireNumber(values, "spend", "Amount spent", missing);
      return massQuantity(values, factor, missing);
    case 3:
      return energyQuantity(values, "quantity", "unit", factor, missing);
    case 4:
      return transportQuantity(method, values, factor, missing);
    case 5:
      return wasteQuantity(values, factor, missing);
    case 6:
      return travelQuantity(method, values, factor, missing);
    case 7:
      return commuteQuantity(method, values, factor, missing);
    case 8:
    case 13:
      return leasedQuantity(method, values, factor, missing);
    case 9:
      return downstreamTdQuantity(method, values, factor, missing);
    case 10:
      if (method === "site-specific") return energyQuantity(values, "energyQuantity", "energyUnit", factor, missing);
      return massQuantity(values, factor, missing);
    case 11:
      return usePhaseQuantity(method, values, factor, missing);
    case 12:
      return endOfLifeQuantity(values, factor, missing);
    case 14:
      return franchiseQuantity(method, values, factor, missing);
    case 15:
      return investmentQuantity(method, values, missing);
    default:
      return massQuantity(values, factor, missing);
  }
}

function massQuantity(values: Record<string, string>, factor: EmissionFactor | undefined, missing: string[]): number | null {
  const quantity = requireNumber(values, "quantity", "Quantity", missing);
  if (quantity == null) return null;
  const unit = values.unit || "Units";
  if (!factor) return quantity;
  return convertToDenominator(quantity, unit, factor);
}

function energyQuantity(
  values: Record<string, string>,
  qtyKey: string,
  unitKey: string,
  factor: EmissionFactor | undefined,
  missing: string[],
): number | null {
  const quantity = requireNumber(values, qtyKey, "Energy or fuel quantity", missing);
  if (quantity == null) return null;
  const unit = values[unitKey] || "kWh";
  if (!factor) return quantity;
  return convertToDenominator(quantity, unit, factor);
}

function wasteQuantity(values: Record<string, string>, factor: EmissionFactor | undefined, missing: string[]): number | null {
  const quantity = requireNumber(values, "quantity", "Quantity", missing);
  if (quantity == null) return null;
  const unit = values.unit || "Tonnes";
  if (!factor) return toTonnes(quantity, unit);
  return convertToDenominator(quantity, unit, factor);
}

function transportQuantity(
  method: string,
  values: Record<string, string>,
  factor: EmissionFactor | undefined,
  missing: string[],
): number | null {
  if (method === "fuel-based") return energyQuantity(values, "fuelQuantity", "fuelUnit", factor, missing);
  if (method === "spend-based") return requireNumber(values, "spend", "Amount spent", missing);
  const mass = requireNumber(values, "cargoMass", "Cargo mass", missing);
  const distance = requireNumber(values, "distance", "Distance", missing);
  if (mass == null || distance == null) return null;
  const distanceUnit = values.distanceUnit || "km";
  if (distanceUnit === "tkm" || distanceUnit === "pkm") return distance;
  const tonnes = toTonnes(mass, values.massUnit || "Tonnes");
  return tonnes * toKm(distance, distanceUnit);
}

function travelQuantity(
  method: string,
  values: Record<string, string>,
  factor: EmissionFactor | undefined,
  missing: string[],
): number | null {
  if (method === "fuel-based") return energyQuantity(values, "fuelQuantity", "fuelUnit", factor, missing);
  if (method === "spend-based") return requireNumber(values, "spend", "Amount spent", missing);
  const distance = requireNumber(values, "distance", "Distance", missing);
  if (distance == null) return null;
  const trips = parseAmount(values.trips) ?? 1;
  const unit = values.distanceUnit || "pkm";
  if (unit === "pkm") return distance;
  return toKm(distance, unit) * trips;
}

function commuteQuantity(
  method: string,
  values: Record<string, string>,
  factor: EmissionFactor | undefined,
  missing: string[],
): number | null {
  if (method === "fuel-based") return energyQuantity(values, "fuelQuantity", "fuelUnit", factor, missing);
  if (method === "average-data") {
    const headcount = requireNumber(values, "headcount", "Headcount", missing);
    if (headcount == null) return null;
    if (!factor) return headcount;
    return convertToDenominator(headcount, "employee", factor);
  }
  const employees = requireNumber(values, "employees", "Number of employees", missing);
  const oneWay = requireNumber(values, "oneWayKm", "One-way distance", missing);
  const days = requireNumber(values, "commutingDays", "Commuting days / year", missing);
  if (employees == null || oneWay == null || days == null) return null;
  return employees * days * 2 * oneWay;
}

function leasedQuantity(
  method: string,
  values: Record<string, string>,
  factor: EmissionFactor | undefined,
  missing: string[],
): number | null {
  if (method === "average-data") {
    const area = requireNumber(values, "floorArea", "Floor area", missing);
    if (area == null) return null;
    const unit = values.areaUnit || "m²";
    if (!factor) return toM2(area, unit);
    return convertToDenominator(area, unit, factor);
  }
  return energyQuantity(values, "energyQuantity", "energyUnit", factor, missing);
}

function downstreamTdQuantity(
  method: string,
  values: Record<string, string>,
  factor: EmissionFactor | undefined,
  missing: string[],
): number | null {
  if (method === "site-specific") return energyQuantity(values, "energyQuantity", "energyUnit", factor, missing);
  if (method === "average-data") {
    const quantity = requireNumber(values, "productQuantity", "Product quantity", missing);
    if (quantity == null) return null;
    const unit = values.unit || "Tonnes";
    if (!factor) return quantity;
    return convertToDenominator(quantity, unit, factor);
  }
  const mass = requireNumber(values, "productMass", "Product mass", missing);
  const distance = requireNumber(values, "distance", "Distance", missing);
  if (mass == null || distance == null) return null;
  const distanceUnit = values.distanceUnit || "km";
  if (distanceUnit === "tkm" || distanceUnit === "pkm") return distance;
  return toTonnes(mass, values.massUnit || "Tonnes") * toKm(distance, distanceUnit);
}

function usePhaseQuantity(
  method: string,
  values: Record<string, string>,
  factor: EmissionFactor | undefined,
  missing: string[],
): number | null {
  const units = requireNumber(values, "unitsSold", "Units sold", missing);
  const lifetime = requireNumber(values, "lifetimeYears", "Expected lifetime", missing);
  const intensityKey = method === "optional-indirect" ? "indirectIntensity" : "intensity";
  const unitKey = method === "optional-indirect" ? "indirectUnit" : "intensityUnit";
  const intensity = requireNumber(values, intensityKey, "Energy, fuel, or GHG per year", missing);
  if (units == null || lifetime == null || intensity == null) return null;
  const total = units * lifetime * intensity;
  const unit = values[unitKey] || "kWh / year";
  if (!factor) return total;
  return convertToDenominator(total, unit.replace(" / year", ""), factor);
}

function endOfLifeQuantity(values: Record<string, string>, factor: EmissionFactor | undefined, missing: string[]): number | null {
  const mass = requireNumber(values, "mass", "Mass at end of life", missing);
  if (mass == null) return null;
  const share = parseAmount(values.percentToTreatment);
  const fraction = share == null ? 1 : share / 100;
  const tonnes = toTonnes(mass, values.massUnit || "Tonnes") * fraction;
  if (!factor) return tonnes;
  return convertToDenominator(tonnes, "Tonnes", factor);
}

function franchiseQuantity(
  method: string,
  values: Record<string, string>,
  factor: EmissionFactor | undefined,
  missing: string[],
): number | null {
  if (method === "franchise-specific") return energyQuantity(values, "energyQuantity", "energyUnit", factor, missing);
  const sites = requireNumber(values, "numberOfFranchises", "Number of franchises", missing);
  if (sites == null) return null;
  const area = parseAmount(values.floorAreaPerSite);
  if (area == null) {
    if (!factor) return sites;
    const per = factorDenominator(factor.unit);
    if (per.includes("m")) {
      missing.push("Average floor area / site");
      return null;
    }
    return convertToDenominator(sites, "franchise", factor);
  }
  const totalArea = sites * toM2(area, values.areaUnit || "m²");
  if (!factor) return totalArea;
  return convertToDenominator(totalArea, "m²", factor);
}

function investmentQuantity(method: string, values: Record<string, string>, missing: string[]): number | null {
  if (method === "investment-specific") {
    const share = requireNumber(values, "equityShare", "Equity share", missing);
    const s1 = requireNumber(values, "investeeScope1", "Investee scope 1", missing);
    const s2 = requireNumber(values, "investeeScope2", "Investee scope 2", missing);
    if (share == null || s1 == null || s2 == null) return null;
    const allocated = (s1 + s2) * (share / 100);
    return values.emissionsUnit === "kg CO2e" ? allocated / 1000 : allocated;
  }
  return requireNumber(values, "investmentValue", "Investment value", missing);
}

function activityIsMonetary(categoryId: number, method: string) {
  return method === "spend-based" || (categoryId === 15 && method === "average-data");
}

function needsFactor(categoryId: number, method: string) {
  return !(categoryId === 15 && method === "investment-specific");
}

function applySpend(amount: number, values: Record<string, string>, factor: EmissionFactor, ctx: CalcContext, missing: string[]) {
  const target = factorCurrency(factor.unit);
  if (!target) return { quantity: amount, conversion: undefined };
  const currency = values.currency?.trim();
  if (!currency) {
    missing.push("Currency");
    return { quantity: null, conversion: undefined };
  }
  const converted = convertSpend(amount, currency, target, ctx.reportingYear, parseAmount(values.fxRate));
  if (!converted) {
    missing.push("Currency conversion");
    return { quantity: null, conversion: undefined };
  }
  return { quantity: converted.amount, conversion: converted };
}

function hybridEmissions(
  values: Record<string, string>,
  item: ActivityItem,
  ctx: CalcContext,
  missing: string[],
): { tco2e: number; supplierTco2e: number; secondaryTco2e: number; factor?: EmissionFactor; secondaryFactor?: EmissionFactor; conversion?: SpendConversion; steps: string[] } {
  const sharePct = requireNumber(values, "primarySharePct", "Share with supplier-specific data (%)", missing);
  const primary = factorById(item.factorId, ctx.catalog);
  const secondary = factorById(item.secondaryFactorId, ctx.catalog);
  const steps: string[] = [];
  if (sharePct == null) return { tco2e: 0, supplierTco2e: 0, secondaryTco2e: 0, factor: primary, secondaryFactor: secondary, steps };
  if (sharePct < 0 || sharePct > 100) missing.push("Supplier-specific share (%) must be 0–100");
  const share = Math.min(100, Math.max(0, sharePct)) / 100;
  if (share > 0 && !primary) missing.push("Supplier-specific emission factor");
  if (share < 1 && !secondary) missing.push("Secondary emission factor");
  steps.push(`Supplier-specific share ${formatTco2e(sharePct)}%`);

  const needsMass = share > 0 || (share < 1 && secondary && !isSpendFactor(secondary.unit));
  const mass = needsMass ? massQuantity(values, primary ?? secondary, missing) : 0;

  let supplierTco2e = 0;
  if (share > 0 && primary && mass != null) {
    supplierTco2e = applyFactor(mass * share, primary);
    steps.push(factorApplyLine(mass * share, primary, supplierTco2e, "Supplier"));
  }

  let secondaryTco2e = 0;
  let conversion: SpendConversion | undefined;
  if (share < 1 && secondary) {
    if (isSpendFactor(secondary.unit)) {
      const spend = requireNumber(values, "spend", "Amount spent", missing);
      if (spend != null) {
        const converted = applySpend(spend * (1 - share), values, secondary, ctx, missing);
        conversion = converted.conversion;
        if (converted.quantity != null) {
          secondaryTco2e = applyFactor(converted.quantity, secondary);
          if (conversion) {
            steps.push(`Remaining spend converted ${conversion.from} → ${conversion.to} at ${conversion.rate}`);
          }
          steps.push(factorApplyLine(converted.quantity, secondary, secondaryTco2e, "Secondary"));
        }
      }
    } else if (mass != null) {
      secondaryTco2e = applyFactor(mass * (1 - share), secondary);
      steps.push(factorApplyLine(mass * (1 - share), secondary, secondaryTco2e, "Secondary"));
    }
  }

  steps.push(`Total ${formatTco2e(supplierTco2e + secondaryTco2e)} tCO₂e`);
  return { tco2e: supplierTco2e + secondaryTco2e, supplierTco2e, secondaryTco2e, factor: primary, secondaryFactor: secondary, conversion, steps };
}

export function calculateItem(
  categoryId: number,
  method: string,
  item: ActivityItem,
  ctx: CalcContext = { catalog: EMISSION_FACTORS, reportingYear: "", hq: "" },
): ItemResult {
  const missing = requiredFieldGaps(categoryId, method, item.values);
  const factor = factorById(item.factorId, ctx.catalog);
  const secondaryFactor = factorById(item.secondaryFactorId, ctx.catalog);
  let biogenicTco2e = Math.max(0, parseAmount(item.values.biogenicTco2e) ?? 0);
  let tco2e = 0;
  let supplierTco2e = 0;
  let secondaryTco2e = 0;
  let spendConversion: SpendConversion | undefined;
  let quantity: number | null = null;
  let steps: string[] = [];

  if (method === "hybrid" && (categoryId === 1 || categoryId === 2)) {
    const hybrid = hybridEmissions(item.values, item, ctx, missing);
    tco2e = hybrid.tco2e;
    supplierTco2e = hybrid.supplierTco2e;
    secondaryTco2e = hybrid.secondaryTco2e;
    spendConversion = hybrid.conversion;
    quantity = 1;
    steps = hybrid.steps;
  } else {
    if (needsFactor(categoryId, method) && !factor) missing.push("Emission factor");
    quantity = quantityForItem(categoryId, method, item.values, factor, missing);
    if (quantity != null && factor && isSpendFactor(factor.unit) && activityIsMonetary(categoryId, method)) {
      const converted = applySpend(quantity, item.values, factor, ctx, missing);
      spendConversion = converted.conversion;
      quantity = converted.quantity;
    }
    if (quantity != null) {
      if (categoryId === 15 && method === "investment-specific") tco2e = quantity;
      else if (factor) tco2e = applyFactor(quantity, factor);
      if (["supplier-specific", "site-specific", "asset-specific", "franchise-specific", "investment-specific", "lessor-specific"].includes(method)) {
        supplierTco2e = tco2e;
      } else {
        secondaryTco2e = tco2e;
      }
      const lead = activityLead(item.values);
      if (lead) steps.push(lead);
      if (spendConversion) {
        steps.push(`Converted ${spendConversion.from} → ${spendConversion.to} at ${spendConversion.rate}`);
      }
      if (categoryId === 15 && method === "investment-specific") {
        steps.push(`Allocated share = ${formatTco2e(tco2e)} tCO₂e`);
      } else if (factor) {
        steps.push(factorApplyLine(quantity, factor, tco2e));
      }
    }
  }

  const uniqueMissing = [...new Set(missing)];
  const complete = uniqueMissing.length === 0 && quantity != null;
  if (!complete) {
    tco2e = 0;
    supplierTco2e = 0;
    secondaryTco2e = 0;
    biogenicTco2e = 0;
    steps = [`Not calculated: ${uniqueMissing.join(", ") || "missing inputs"}`];
  }
  const requiredCount = fieldsFor(categoryId, method).filter((field) => field.required && !field.optional).length;
  const dqa = scoreItemDqa({
    method,
    complete,
    missingCount: uniqueMissing.length,
    requiredCount: requiredCount || uniqueMissing.length + (complete ? 1 : 0),
    factor: factor ?? secondaryFactor,
    secondaryFactor,
    reportingYear: ctx.reportingYear,
    hq: ctx.hq,
  });

  return {
    categoryId,
    itemId: item.id,
    label: itemLabel(item.values),
    method,
    tco2e,
    supplierTco2e,
    secondaryTco2e,
    biogenicTco2e,
    complete,
    missing: uniqueMissing,
    factor,
    secondaryFactor,
    spendConversion,
    steps,
    dqa,
  };
}

export function calculateInventory(state: InventoryState, catalog: EmissionFactor[] = EMISSION_FACTORS): InventoryResult {
  const ctx: CalcContext = { catalog, reportingYear: state.year, hq: state.hq };
  const included = SCOPE3_CATEGORIES.filter((category) => state.categories[category.id] === "included");
  const categories: CategoryResult[] = included.map((category) => {
    const entry = state.entries[category.id];
    const method = entry?.method ?? "";
    const formula = formulaFor(category.id, method);
    const items = (entry?.items ?? []).map((item) => calculateItem(category.id, method, item, ctx));
    const tco2e = items.reduce((sum, item) => sum + item.tco2e, 0);
    return {
      id: category.id,
      name: category.name,
      stream: category.stream,
      method,
      methodLabel: formula.methodLabel,
      formula: formula.headline,
      methodFormula: formula.methodFormula,
      tco2e,
      supplierTco2e: items.reduce((sum, item) => sum + item.supplierTco2e, 0),
      secondaryTco2e: items.reduce((sum, item) => sum + item.secondaryTco2e, 0),
      biogenicTco2e: items.reduce((sum, item) => sum + item.biogenicTco2e, 0),
      share: 0,
      items,
      completeCount: items.filter((item) => item.complete).length,
    };
  });
  const totalTco2e = categories.reduce((sum, category) => sum + category.tco2e, 0);
  const supplierTco2e = categories.reduce((sum, category) => sum + category.supplierTco2e, 0);
  const secondaryTco2e = categories.reduce((sum, category) => sum + category.secondaryTco2e, 0);
  const biogenicTco2e = categories.reduce((sum, category) => sum + category.biogenicTco2e, 0);
  const upstreamTco2e = categories.filter((category) => category.stream === "upstream").reduce((sum, category) => sum + category.tco2e, 0);
  const downstreamTco2e = categories.filter((category) => category.stream === "downstream").reduce((sum, category) => sum + category.tco2e, 0);
  for (const category of categories) {
    category.share = totalTco2e > 0 ? (category.tco2e / totalTco2e) * 100 : 0;
  }
  const totalItems = categories.reduce((sum, category) => sum + category.items.length, 0);
  const completeItems = categories.reduce((sum, category) => sum + category.completeCount, 0);
  const dqa = aggregateDqa(categories.flatMap((category) => category.items.map((item) => ({ dqa: item.dqa, tco2e: item.tco2e }))));
  return {
    totalTco2e,
    biogenicTco2e,
    supplierTco2e,
    secondaryTco2e,
    supplierSharePct: totalTco2e > 0 ? (supplierTco2e / totalTco2e) * 100 : 0,
    upstreamTco2e,
    downstreamTco2e,
    categories,
    includedCount: included.length,
    completeItems,
    totalItems,
    completenessPct: totalItems ? Math.round((completeItems / totalItems) * 100) : 0,
    dataQualityPct: dqaPercent(dqa.overall),
    dqa,
    hasCalculableData: completeItems > 0,
  };
}
