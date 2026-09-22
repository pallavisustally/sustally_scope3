import { formatReportingYear } from "@/lib/reporting-year";

export type ActivityField = {
  id: string;
  label: string;
  type: "text" | "select" | "textarea" | "year";
  required?: boolean;
  optional?: boolean;
  placeholder?: string;
  options?: string[];
  methods?: string[];
  wide?: boolean;
  visibleWhen?: { mode?: string[] };
};

const CURRENCIES = ["INR", "USD", "EUR", "GBP"];
const MASS_UNITS = ["Tonnes", "Kilograms", "Units", "Cubic metres"];
const ENERGY_UNITS = ["kWh", "MWh", "GJ", "Litres", "Kilograms", "Cubic metres"];
const DISTANCE_UNITS = ["km", "tkm", "pkm", "miles"];
const AREA_UNITS = ["m²", "sq ft"];
const TRANSPORT_MODES = ["Road - HGV", "Road - van", "Rail", "Air", "Sea - container", "Inland waterway", "Pipeline"];
const WASTE_TYPES = ["Mixed industrial", "Paper and cardboard", "Plastic", "Metal", "Organic", "Hazardous", "Construction", "Wastewater"];
const TREATMENTS = ["Landfill", "Recycling", "Incineration", "Composting", "Anaerobic digestion", "Wastewater treatment"];
const TRAVEL_MODES = ["Air", "Rail", "Car", "Bus", "Taxi", "Ferry"];

function field(id: string, label: string, extra: Partial<ActivityField> = {}): ActivityField {
  return { id, label, type: "text", ...extra };
}

export const CATEGORY_FIELDS: Record<number, ActivityField[]> = {
  1: [
    field("item", "Good or service", { required: true, placeholder: "e.g. Steel, packaging, cloud hosting" }),
    field("description", "Description", { optional: true, wide: true, placeholder: "e.g. Used in production of finished goods" }),
    field("quantity", "Quantity", { required: true, placeholder: "e.g. 1000", methods: ["supplier-specific", "hybrid", "average-data"] }),
    field("unit", "Unit", { type: "select", required: true, options: MASS_UNITS, methods: ["supplier-specific", "hybrid", "average-data"] }),
    field("spend", "Amount spent", { required: true, placeholder: "e.g. 2500000", methods: ["spend-based", "hybrid"] }),
    field("currency", "Currency", { type: "select", required: true, options: CURRENCIES, methods: ["spend-based", "hybrid"] }),
    field("spendSector", "EEIO sector", { type: "select", optional: true, options: ["Basic metals", "Chemicals", "Paper", "IT services", "Professional services", "Other"], methods: ["spend-based"] }),
    field("supplier", "Supplier", { optional: true, wide: true }),
    field("supplierEmail", "Supplier email", { optional: true, placeholder: "e.g. sustainability@supplier.com" }),
    field("supplierProduct", "Supplier product or SKU", { optional: true, methods: ["supplier-specific", "hybrid"] }),
  ],
  2: [
    field("item", "Capital good", { required: true, placeholder: "e.g. CNC machine, building, vehicle fleet" }),
    field("assetClass", "Asset class", { type: "select", options: ["Buildings", "Machinery", "Vehicles", "IT equipment", "Furniture", "Other"] }),
    field("yearAcquired", "Year of supply", { type: "year" }),
    field("quantity", "Quantity", { required: true, placeholder: "e.g. 2", methods: ["supplier-specific", "hybrid", "average-data"] }),
    field("unit", "Unit", { type: "select", required: true, options: ["Units", "Tonnes", "Kilograms", "m²"], methods: ["supplier-specific", "hybrid", "average-data"] }),
    field("spend", "Amount spent", { required: true, placeholder: "e.g. 18500000", methods: ["spend-based", "hybrid"] }),
    field("currency", "Currency", { type: "select", required: true, options: CURRENCIES, methods: ["spend-based", "hybrid"] }),
    field("supplier", "Supplier", { optional: true, wide: true }),
    field("supplierEmail", "Supplier email", { optional: true, placeholder: "e.g. sustainability@supplier.com" }),
  ],
  3: [
    field("activityType", "Activity type", {
      type: "select",
      required: true,
      options: ["Upstream fuels", "Upstream electricity", "T&D losses", "Energy purchased for resale"],
    }),
    field("energyCarrier", "Fuel or energy", { optional: true, placeholder: "e.g. Grid electricity, diesel, natural gas" }),
    field("quantity", "Quantity", { required: true, placeholder: "e.g. 2400000" }),
    field("unit", "Unit", { type: "select", required: true, options: ENERGY_UNITS }),
    field("gridRegion", "Grid or fuel region", { optional: true, placeholder: "e.g. India, EU, US grid" }),
    field("supplier", "Fuel or utility supplier", { optional: true, methods: ["supplier-specific"], wide: true }),
    field("supplierEmail", "Supplier email", { optional: true, methods: ["supplier-specific"], placeholder: "e.g. sustainability@utility.com" }),
  ],
  4: [
    field("item", "Shipment or lane", { required: true, placeholder: "e.g. Inbound steel coil, inter-facility transfer" }),
    field("fuelType", "Fuel type", { type: "select", optional: true, options: ["Diesel", "Petrol", "CNG", "LNG", "Electricity", "Marine fuel"], methods: ["fuel-based"] }),
    field("fuelQuantity", "Fuel consumed", { required: true, placeholder: "e.g. 12000", methods: ["fuel-based"] }),
    field("fuelUnit", "Fuel unit", { type: "select", required: true, options: ["Litres", "Kilograms", "kWh"], methods: ["fuel-based"] }),
    field("vehicleType", "Vehicle type", { optional: true, methods: ["fuel-based"] }),
    field("cargoMass", "Cargo mass", { required: true, placeholder: "e.g. 1000", methods: ["distance-based"] }),
    field("massUnit", "Mass unit", { type: "select", required: true, options: ["Tonnes", "Kilograms"], methods: ["distance-based"] }),
    field("distance", "Distance", { required: true, placeholder: "e.g. 450", methods: ["distance-based"] }),
    field("distanceUnit", "Distance unit", { type: "select", required: true, options: DISTANCE_UNITS, methods: ["distance-based"] }),
    field("mode", "Transport mode", { type: "select", optional: true, options: TRANSPORT_MODES, methods: ["distance-based"] }),
    field("origin", "Origin", { optional: true, placeholder: "e.g. Chennai port", methods: ["distance-based"] }),
    field("destination", "Destination", { optional: true, placeholder: "e.g. Bengaluru plant", methods: ["distance-based"] }),
    field("spend", "Amount spent", { required: true, placeholder: "e.g. 850000", methods: ["spend-based"] }),
    field("currency", "Currency", { type: "select", required: true, options: CURRENCIES, methods: ["spend-based"] }),
    field("serviceType", "Service type", { type: "select", optional: true, options: ["Road freight", "Air freight", "Sea freight", "Rail freight", "Warehousing"], methods: ["spend-based"] }),
  ],
  5: [
    field("wasteType", "Waste type", { type: "select", required: true, options: WASTE_TYPES }),
    field("quantity", "Quantity", { required: true, placeholder: "e.g. 120" }),
    field("unit", "Unit", { type: "select", required: true, options: ["Tonnes", "Kilograms", "Cubic metres"] }),
    field("treatmentMethod", "Treatment method", { type: "select", optional: true, options: TREATMENTS, methods: ["supplier-specific", "waste-type"] }),
    field("treatmentProvider", "Vendor name", { optional: true, methods: ["supplier-specific"], wide: true, placeholder: "e.g. waste vendor name" }),
    field("supplierEmail", "Vendor email", { optional: true, methods: ["supplier-specific"], placeholder: "e.g. contact@vendor.com" }),
  ],
  6: [
    field("item", "Travel activity", { required: true, placeholder: "e.g. Mumbai sales visits, annual conference" }),
    field("mode", "Travel mode", { type: "select", required: true, options: TRAVEL_MODES }),
    field("fuelType", "Fuel type", { type: "select", optional: true, options: ["Jet fuel", "Diesel", "Petrol", "Electricity"], methods: ["fuel-based"] }),
    field("fuelQuantity", "Fuel consumed", { required: true, placeholder: "e.g. 8000", methods: ["fuel-based"] }),
    field("fuelUnit", "Fuel unit", { type: "select", required: true, options: ["Litres", "Kilograms", "kWh"], methods: ["fuel-based"] }),
    field("haulLength", "Haul length", {
      type: "select",
      required: true,
      options: ["Domestic", "Short-haul", "Long-haul"],
      methods: ["distance-based"],
      visibleWhen: { mode: ["Air"] },
    }),
    field("cabinClass", "Cabin class", {
      type: "select",
      required: true,
      options: ["Economy", "Premium economy", "Business", "First"],
      methods: ["distance-based"],
      visibleWhen: { mode: ["Air"] },
    }),
    field("distance", "Distance", { required: true, placeholder: "e.g. 185000", methods: ["distance-based"] }),
    field("distanceUnit", "Distance unit", { type: "select", required: true, options: ["pkm", "km", "miles"], methods: ["distance-based"] }),
    field("trips", "Number of trips", { optional: true, placeholder: "e.g. 420", methods: ["distance-based"] }),
    field("origin", "Origin", { optional: true, placeholder: "e.g. Bengaluru", methods: ["distance-based"] }),
    field("destination", "Destination", { optional: true, placeholder: "e.g. Mumbai", methods: ["distance-based"] }),
    field("spend", "Amount spent", { required: true, placeholder: "e.g. 4200000", methods: ["spend-based"] }),
    field("currency", "Currency", { type: "select", required: true, options: CURRENCIES, methods: ["spend-based"] }),
  ],
  7: [
    field("item", "Commuting group", { required: true, placeholder: "e.g. All employees, office A, contractors" }),
    field("mode", "Primary mode", { type: "select", optional: true, options: ["Car", "Two-wheeler", "Bus", "Metro / rail", "Walk / cycle", "Work from home / no commute", "Mixed"], methods: ["fuel-based", "distance-based"] }),
    field("fuelQuantity", "Fuel from surveys", { required: true, placeholder: "e.g. 15000", methods: ["fuel-based"] }),
    field("fuelUnit", "Fuel unit", { type: "select", required: true, options: ["Litres", "kWh"], methods: ["fuel-based"] }),
    field("employeesSurveyed", "Employees surveyed", { placeholder: "e.g. 80", methods: ["fuel-based", "distance-based"] }),
    field("employees", "Number of employees", { required: true, placeholder: "e.g. 420", methods: ["distance-based"] }),
    field("oneWayKm", "One-way distance (km)", { required: true, placeholder: "e.g. 12", methods: ["distance-based"] }),
    field("commutingDays", "Commuting days / year", { required: true, placeholder: "e.g. 220", methods: ["distance-based"] }),
    field("headcount", "Headcount", { required: true, placeholder: "e.g. 420", methods: ["average-data"] }),
    field("officeDaysPerWeek", "Office days / week", { placeholder: "e.g. 4", methods: ["average-data"] }),
    field("region", "Commuting region", { optional: true, placeholder: "e.g. Bengaluru", methods: ["average-data"] }),
  ],
  8: [
    field("assetName", "Leased asset", { required: true, placeholder: "e.g. Leased warehouse, vehicle, office" }),
    field("assetType", "Asset type", { type: "select", options: ["Office", "Warehouse", "Retail", "Vehicle", "Equipment"] }),
    field("energyCarrier", "Energy type", { type: "select", optional: true, options: ["Grid electricity", "Natural gas", "Diesel", "District heat", "Mixed"], methods: ["asset-specific", "lessor-specific"] }),
    field("energyQuantity", "Energy quantity", { required: true, placeholder: "e.g. 180000", methods: ["asset-specific", "lessor-specific"] }),
    field("energyUnit", "Energy unit", { type: "select", required: true, options: ENERGY_UNITS, methods: ["asset-specific", "lessor-specific"] }),
    field("lessorName", "Lessor", { optional: true, placeholder: "e.g. Warehouse lessor name", methods: ["lessor-specific"], wide: true }),
    field("floorArea", "Floor area", { required: true, placeholder: "e.g. 4500", methods: ["average-data"] }),
    field("areaUnit", "Area unit", { type: "select", required: true, options: AREA_UNITS, methods: ["average-data"] }),
    field("buildingType", "Building type", { type: "select", options: ["Office", "Warehouse", "Retail", "Industrial"], methods: ["average-data"] }),
  ],
  9: [
    field("item", "Product, lane, or site", { required: true, placeholder: "e.g. Outbound finished goods, 3PL warehouse" }),
    field("siteName", "Distribution site", { placeholder: "e.g. Regional 3PL hub", methods: ["site-specific"] }),
    field("energyCarrier", "Energy type", { type: "select", optional: true, options: ["Grid electricity", "Natural gas", "Diesel", "Mixed"], methods: ["site-specific"] }),
    field("energyQuantity", "Energy quantity", { required: true, placeholder: "e.g. 96000", methods: ["site-specific"] }),
    field("energyUnit", "Energy unit", { type: "select", required: true, options: ENERGY_UNITS, methods: ["site-specific"] }),
    field("productMass", "Product mass", { required: true, placeholder: "e.g. 800", methods: ["distance-based"] }),
    field("massUnit", "Mass unit", { type: "select", required: true, options: ["Tonnes", "Kilograms"], methods: ["distance-based"] }),
    field("distance", "Distance", { required: true, placeholder: "e.g. 1200", methods: ["distance-based"] }),
    field("distanceUnit", "Distance unit", { type: "select", required: true, options: DISTANCE_UNITS, methods: ["distance-based"] }),
    field("mode", "Transport mode", { type: "select", optional: true, options: TRANSPORT_MODES, methods: ["distance-based"] }),
    field("productQuantity", "Product quantity", { required: true, placeholder: "e.g. 800", methods: ["average-data"] }),
    field("unit", "Unit", { type: "select", required: true, options: MASS_UNITS, methods: ["average-data"] }),
    field("channel", "Distribution channel", { type: "select", options: ["Retail", "Warehouse", "Last-mile", "Customer collection"], methods: ["average-data"] }),
  ],
  10: [
    field("productName", "Intermediate product", { required: true, placeholder: "e.g. Metal parts, resin, fabric" }),
    field("quantity", "Quantity sold", { required: true, placeholder: "e.g. 500", methods: ["average-data"] }),
    field("unit", "Unit", { type: "select", required: true, options: MASS_UNITS, methods: ["average-data"] }),
    field("processType", "Downstream process", { type: "select", options: ["Metal forming", "Chemical processing", "Assembly", "Food processing", "Textile finishing", "Other"] }),
    field("processorName", "Processor", { optional: true, placeholder: "e.g. Downstream fabricator", methods: ["site-specific"], wide: true }),
    field("energyQuantity", "Processor energy", { required: true, placeholder: "e.g. 320000", methods: ["site-specific"] }),
    field("energyUnit", "Energy unit", { type: "select", required: true, options: ENERGY_UNITS, methods: ["site-specific"] }),
  ],
  11: [
    field("productName", "Sold product", { required: true, placeholder: "e.g. Industrial pump, appliance, fuel" }),
    field("unitsSold", "Units sold this year", { required: true, placeholder: "e.g. 3200" }),
    field("lifetimeYears", "Expected lifetime (years)", { required: true, placeholder: "e.g. 10" }),
    field("useType", "Direct use type", {
      type: "select",
      optional: true,
      options: ["Electricity consumed in use", "Fuels consumed in use", "GHGs released in use"],
      methods: ["direct-use"],
    }),
    field("intensity", "Energy, fuel, or GHG per year", { required: true, placeholder: "e.g. 1800", methods: ["direct-use"] }),
    field("intensityUnit", "Intensity unit", { type: "select", required: true, options: ["kWh / year", "Litres / year", "kg GHG / year", "MJ / year"], methods: ["direct-use"] }),
    field("usesPerYear", "Use cycles / year", { optional: true, placeholder: "e.g. 1", methods: ["direct-use"] }),
    field("indirectIntensity", "Indirect energy per year", { required: true, placeholder: "e.g. 240", methods: ["optional-indirect"] }),
    field("indirectUnit", "Unit", { type: "select", required: true, options: ["kWh / year", "MJ / year"], methods: ["optional-indirect"] }),
  ],
  12: [
    field("productName", "Sold product or packaging", { required: true, placeholder: "e.g. Sold product and packaging" }),
    field("mass", "Mass at end of life", { required: true, placeholder: "e.g. 640" }),
    field("massUnit", "Mass unit", { type: "select", required: true, options: ["Tonnes", "Kilograms"] }),
    field("treatmentMethod", "Treatment method", { type: "select", optional: true, options: TREATMENTS, methods: ["waste-type"] }),
    field("percentToTreatment", "Share to this treatment (%)", { required: true, methods: ["waste-type"], placeholder: "e.g. 40" }),
    field("eolRegion", "End-of-life region", { optional: true, methods: ["average-data"] }),
  ],
  13: [
    field("assetName", "Asset leased to others", { required: true, placeholder: "e.g. Building, vehicle, equipment" }),
    field("assetType", "Asset type", { type: "select", options: ["Office", "Warehouse", "Retail", "Vehicle", "Equipment"] }),
    field("lessee", "Lessee", { optional: true, methods: ["asset-specific"] }),
    field("energyCarrier", "Energy type", { type: "select", optional: true, options: ["Grid electricity", "Natural gas", "Diesel", "Mixed"], methods: ["asset-specific"] }),
    field("energyQuantity", "Energy quantity", { required: true, placeholder: "e.g. 110000", methods: ["asset-specific"] }),
    field("energyUnit", "Energy unit", { type: "select", required: true, options: ENERGY_UNITS, methods: ["asset-specific"] }),
    field("floorArea", "Floor area", { required: true, placeholder: "e.g. 2000", methods: ["average-data"] }),
    field("areaUnit", "Area unit", { type: "select", required: true, options: AREA_UNITS, methods: ["average-data"] }),
  ],
  14: [
    field("franchiseType", "Franchise type", { type: "select", optional: true, options: ["QSR / restaurant", "Retail", "Hotel", "Service", "Other"] }),
    field("franchiseeName", "Franchisee", { optional: true, methods: ["franchise-specific"] }),
    field("sites", "Number of sites", { optional: true, placeholder: "e.g. 12", methods: ["franchise-specific"] }),
    field("energyCarrier", "Energy type", { type: "select", optional: true, options: ["Grid electricity", "Natural gas", "Mixed"], methods: ["franchise-specific"] }),
    field("energyQuantity", "Energy quantity", { required: true, placeholder: "e.g. 640000", methods: ["franchise-specific"] }),
    field("energyUnit", "Energy unit", { type: "select", required: true, options: ENERGY_UNITS, methods: ["franchise-specific"] }),
    field("numberOfFranchises", "Number of franchises", { required: true, placeholder: "e.g. 18", methods: ["average-data"] }),
    field("floorAreaPerSite", "Average floor area / site", { placeholder: "e.g. 180", methods: ["average-data"] }),
    field("areaUnit", "Area unit", { type: "select", required: true, options: AREA_UNITS, methods: ["average-data"] }),
  ],
  15: [
    field("investeeName", "Investee or project", { required: true, placeholder: "e.g. Company, fund, or project name" }),
    field("instrument", "Instrument", { type: "select", optional: true, options: ["Equity", "Debt", "Project finance"], methods: ["investment-specific"] }),
    field("equityShare", "Equity or ownership share (%)", { required: true, placeholder: "e.g. 25", methods: ["investment-specific"] }),
    field("investeeScope1", "Investee scope 1", { required: true, placeholder: "e.g. 12000", methods: ["investment-specific"] }),
    field("investeeScope2", "Investee scope 2", { required: true, placeholder: "e.g. 8000", methods: ["investment-specific"] }),
    field("emissionsUnit", "Emissions unit", { type: "select", optional: true, options: ["tCO2e", "kg CO2e"], methods: ["investment-specific"] }),
    field("investmentValue", "Investment value", { required: true, placeholder: "e.g. 5000000", methods: ["average-data"] }),
    field("currency", "Currency", { type: "select", required: true, options: CURRENCIES, methods: ["average-data"] }),
    field("sector", "Sector", { type: "select", optional: true, options: ["Manufacturing", "Energy", "Real estate", "Financial services", "Other"], methods: ["average-data"] }),
  ],
};

export function isFieldVisible(field: ActivityField, values?: Record<string, string>) {
  const modes = field.visibleWhen?.mode;
  if (!modes?.length) return true;
  return modes.includes((values?.mode ?? "").trim());
}

export function fieldsFor(categoryId: number, method: string, values?: Record<string, string>) {
  const rows = (CATEGORY_FIELDS[categoryId] ?? []).filter((entry) => !entry.methods || entry.methods.includes(method));
  const extras: ActivityField[] = [];
  if (method === "hybrid") {
    extras.push(
      field("primarySharePct", "Share with supplier-specific data (%)", {
        required: true,
        placeholder: "e.g. 40 for 40% of quantity from supplier data",
      }),
    );
  }
  if (method === "spend-based" || method === "hybrid" || (categoryId === 15 && method === "average-data")) {
    extras.push(
      field("fxRate", "FX rate override", {
        optional: true,
        placeholder: "e.g. 0.012 if 1 INR = 0.012 USD. Leave blank to use the reporting-year average",
      }),
    );
  }
  return [...rows, ...extras].filter((entry) => isFieldVisible(entry, values));
}

export function blankValues(categoryId: number): Record<string, string> {
  const ids = new Set((CATEGORY_FIELDS[categoryId] ?? []).map((entry) => entry.id));
  ids.add("primarySharePct");
  ids.add("fxRate");
  ids.add("supplierEmail");
  return Object.fromEntries([...ids].map((id) => [id, ""]));
}

export function isYearField(field: Pick<ActivityField, "id" | "type">) {
  return field.type === "year" || field.id === "yearAcquired";
}

export function displayFieldValue(field: ActivityField, value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "—";
  if (isYearField(field)) return formatReportingYear(trimmed) || trimmed;
  return trimmed;
}

export function itemLabel(values: Record<string, string>) {
  return (
    values.item ||
    values.productName ||
    values.assetName ||
    values.investeeName ||
    values.wasteType ||
    values.energyCarrier ||
    values.franchiseType ||
    values.activityType ||
    "Untitled item"
  );
}
