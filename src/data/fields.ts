export type ActivityField = {
  id: string;
  label: string;
  type: "text" | "select" | "textarea";
  required?: boolean;
  optional?: boolean;
  placeholder?: string;
  options?: string[];
  methods?: string[];
  wide?: boolean;
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
    field("item", "Good or service", { required: true, placeholder: "Steel, packaging, cloud hosting…" }),
    field("description", "Description", { optional: true, wide: true }),
    field("quantity", "Quantity", { required: true, methods: ["supplier-specific", "hybrid", "average-data"] }),
    field("unit", "Unit", { type: "select", required: true, options: MASS_UNITS, methods: ["supplier-specific", "hybrid", "average-data"] }),
    field("spend", "Amount spent", { required: true, placeholder: "Numeric amount", methods: ["spend-based", "hybrid"] }),
    field("currency", "Currency", { type: "select", options: CURRENCIES, methods: ["spend-based", "hybrid"] }),
    field("spendSector", "EEIO sector", { type: "select", options: ["Basic metals", "Chemicals", "Paper", "IT services", "Professional services", "Other"], methods: ["spend-based"] }),
    field("supplier", "Supplier", { optional: true, wide: true }),
    field("supplierProduct", "Supplier product or SKU", { optional: true, methods: ["supplier-specific", "hybrid"] }),
  ],
  2: [
    field("item", "Capital good", { required: true, placeholder: "CNC machine, building, vehicle fleet…" }),
    field("assetClass", "Asset class", { type: "select", options: ["Buildings", "Machinery", "Vehicles", "IT equipment", "Furniture", "Other"] }),
    field("yearAcquired", "Year of acquisition", { placeholder: "Same as reporting year" }),
    field("quantity", "Quantity", { required: true, methods: ["supplier-specific", "hybrid", "average-data"] }),
    field("unit", "Unit", { type: "select", options: ["Units", "Tonnes", "Kilograms", "m²"], methods: ["supplier-specific", "hybrid", "average-data"] }),
    field("spend", "Amount spent", { required: true, methods: ["spend-based", "hybrid"] }),
    field("currency", "Currency", { type: "select", options: CURRENCIES, methods: ["spend-based", "hybrid"] }),
    field("supplier", "Supplier", { optional: true, wide: true }),
  ],
  3: [
    field("activityType", "Activity type", {
      type: "select",
      required: true,
      options: ["Upstream fuels", "Upstream electricity", "T&D losses", "Energy purchased for resale"],
    }),
    field("energyCarrier", "Fuel or energy", { required: true, placeholder: "Grid electricity, diesel, natural gas…" }),
    field("quantity", "Quantity", { required: true }),
    field("unit", "Unit", { type: "select", required: true, options: ENERGY_UNITS }),
    field("gridRegion", "Grid or fuel region", { optional: true }),
    field("supplier", "Fuel or utility supplier", { optional: true, methods: ["supplier-specific"], wide: true }),
  ],
  4: [
    field("item", "Shipment or lane", { required: true, placeholder: "Inbound steel coil, inter-facility transfer…" }),
    field("fuelType", "Fuel type", { type: "select", options: ["Diesel", "Petrol", "CNG", "LNG", "Electricity", "Marine fuel"], methods: ["fuel-based"] }),
    field("fuelQuantity", "Fuel consumed", { required: true, methods: ["fuel-based"] }),
    field("fuelUnit", "Fuel unit", { type: "select", options: ["Litres", "Kilograms", "kWh"], methods: ["fuel-based"] }),
    field("vehicleType", "Vehicle type", { optional: true, methods: ["fuel-based"] }),
    field("cargoMass", "Cargo mass", { required: true, methods: ["distance-based"] }),
    field("massUnit", "Mass unit", { type: "select", options: ["Tonnes", "Kilograms"], methods: ["distance-based"] }),
    field("distance", "Distance", { required: true, methods: ["distance-based"] }),
    field("distanceUnit", "Distance unit", { type: "select", options: DISTANCE_UNITS, methods: ["distance-based"] }),
    field("mode", "Transport mode", { type: "select", required: true, options: TRANSPORT_MODES, methods: ["distance-based"] }),
    field("origin", "Origin", { optional: true, methods: ["distance-based"] }),
    field("destination", "Destination", { optional: true, methods: ["distance-based"] }),
    field("spend", "Amount spent", { required: true, methods: ["spend-based"] }),
    field("currency", "Currency", { type: "select", options: CURRENCIES, methods: ["spend-based"] }),
    field("serviceType", "Service type", { type: "select", options: ["Road freight", "Air freight", "Sea freight", "Rail freight", "Warehousing"], methods: ["spend-based"] }),
  ],
  5: [
    field("wasteType", "Waste type", { type: "select", required: true, options: WASTE_TYPES }),
    field("quantity", "Quantity", { required: true }),
    field("unit", "Unit", { type: "select", required: true, options: ["Tonnes", "Kilograms", "Cubic metres"] }),
    field("treatmentMethod", "Treatment method", { type: "select", required: true, options: TREATMENTS, methods: ["supplier-specific", "waste-type"] }),
    field("treatmentProvider", "Treatment provider", { optional: true, methods: ["supplier-specific"], wide: true }),
  ],
  6: [
    field("item", "Travel activity", { required: true, placeholder: "Short-haul flights, rail, taxi…" }),
    field("mode", "Travel mode", { type: "select", required: true, options: TRAVEL_MODES }),
    field("fuelType", "Fuel type", { type: "select", options: ["Jet fuel", "Diesel", "Petrol", "Electricity"], methods: ["fuel-based"] }),
    field("fuelQuantity", "Fuel consumed", { required: true, methods: ["fuel-based"] }),
    field("fuelUnit", "Fuel unit", { type: "select", options: ["Litres", "Kilograms", "kWh"], methods: ["fuel-based"] }),
    field("cabinClass", "Cabin or vehicle class", { type: "select", options: ["Economy", "Premium economy", "Business", "First", "Average car", "Not applicable"], methods: ["distance-based"] }),
    field("distance", "Distance", { required: true, methods: ["distance-based"] }),
    field("distanceUnit", "Distance unit", { type: "select", options: ["pkm", "km", "miles"], methods: ["distance-based"] }),
    field("trips", "Number of trips", { optional: true, methods: ["distance-based"] }),
    field("origin", "Origin", { optional: true, methods: ["distance-based"] }),
    field("destination", "Destination", { optional: true, methods: ["distance-based"] }),
    field("spend", "Amount spent", { required: true, methods: ["spend-based"] }),
    field("currency", "Currency", { type: "select", options: CURRENCIES, methods: ["spend-based"] }),
  ],
  7: [
    field("item", "Commuting group", { required: true, placeholder: "All employees, office A, contractors…" }),
    field("mode", "Primary mode", { type: "select", options: ["Car", "Two-wheeler", "Bus", "Metro / rail", "Walk / cycle", "Mixed"], methods: ["fuel-based", "distance-based"] }),
    field("fuelQuantity", "Fuel from surveys", { required: true, methods: ["fuel-based"] }),
    field("fuelUnit", "Fuel unit", { type: "select", options: ["Litres", "kWh"], methods: ["fuel-based"] }),
    field("employeesSurveyed", "Employees surveyed", { methods: ["fuel-based", "distance-based"] }),
    field("employees", "Number of employees", { required: true, methods: ["distance-based"] }),
    field("oneWayKm", "One-way distance (km)", { required: true, methods: ["distance-based"] }),
    field("commutingDays", "Commuting days / year", { methods: ["distance-based"] }),
    field("headcount", "Headcount", { required: true, methods: ["average-data"] }),
    field("officeDaysPerWeek", "Office days / week", { methods: ["average-data"] }),
    field("region", "Commuting region", { optional: true, methods: ["average-data"] }),
  ],
  8: [
    field("assetName", "Leased asset", { required: true, placeholder: "Leased warehouse, vehicle, office…" }),
    field("assetType", "Asset type", { type: "select", options: ["Office", "Warehouse", "Retail", "Vehicle", "Equipment"] }),
    field("energyCarrier", "Energy type", { type: "select", options: ["Grid electricity", "Natural gas", "Diesel", "District heat", "Mixed"], methods: ["asset-specific", "lessor-specific"] }),
    field("energyQuantity", "Energy quantity", { required: true, methods: ["asset-specific", "lessor-specific"] }),
    field("energyUnit", "Energy unit", { type: "select", options: ENERGY_UNITS, methods: ["asset-specific", "lessor-specific"] }),
    field("lessorName", "Lessor", { optional: true, methods: ["lessor-specific"], wide: true }),
    field("floorArea", "Floor area", { required: true, methods: ["average-data"] }),
    field("areaUnit", "Area unit", { type: "select", options: AREA_UNITS, methods: ["average-data"] }),
    field("buildingType", "Building type", { type: "select", options: ["Office", "Warehouse", "Retail", "Industrial"], methods: ["average-data"] }),
  ],
  9: [
    field("item", "Product, lane, or site", { required: true, placeholder: "Outbound finished goods, 3PL warehouse…" }),
    field("siteName", "Distribution site", { methods: ["site-specific"] }),
    field("energyCarrier", "Energy type", { type: "select", options: ["Grid electricity", "Natural gas", "Diesel", "Mixed"], methods: ["site-specific"] }),
    field("energyQuantity", "Energy quantity", { required: true, methods: ["site-specific"] }),
    field("energyUnit", "Energy unit", { type: "select", options: ENERGY_UNITS, methods: ["site-specific"] }),
    field("productMass", "Product mass", { required: true, methods: ["distance-based"] }),
    field("massUnit", "Mass unit", { type: "select", options: ["Tonnes", "Kilograms"], methods: ["distance-based"] }),
    field("distance", "Distance", { required: true, methods: ["distance-based"] }),
    field("distanceUnit", "Distance unit", { type: "select", options: DISTANCE_UNITS, methods: ["distance-based"] }),
    field("mode", "Transport mode", { type: "select", required: true, options: TRANSPORT_MODES, methods: ["distance-based"] }),
    field("productQuantity", "Product quantity", { required: true, methods: ["average-data"] }),
    field("unit", "Unit", { type: "select", options: MASS_UNITS, methods: ["average-data"] }),
    field("channel", "Distribution channel", { type: "select", options: ["Retail", "Warehouse", "Last-mile", "Customer collection"], methods: ["average-data"] }),
  ],
  10: [
    field("productName", "Intermediate product", { required: true, placeholder: "Metal parts, resin, fabric…" }),
    field("quantity", "Quantity sold", { required: true }),
    field("unit", "Unit", { type: "select", required: true, options: MASS_UNITS }),
    field("processType", "Downstream process", { type: "select", options: ["Metal forming", "Chemical processing", "Assembly", "Food processing", "Textile finishing", "Other"] }),
    field("processorName", "Processor", { optional: true, methods: ["site-specific"], wide: true }),
    field("energyQuantity", "Processor energy", { required: true, methods: ["site-specific"] }),
    field("energyUnit", "Energy unit", { type: "select", options: ENERGY_UNITS, methods: ["site-specific"] }),
  ],
  11: [
    field("productName", "Sold product", { required: true, placeholder: "Industrial pump, appliance, fuel…" }),
    field("unitsSold", "Units sold this year", { required: true }),
    field("lifetimeYears", "Expected lifetime (years)", { required: true }),
    field("useType", "Direct use type", {
      type: "select",
      required: true,
      options: ["Electricity consumed in use", "Fuels consumed in use", "GHGs released in use"],
      methods: ["direct-use"],
    }),
    field("intensity", "Energy, fuel, or GHG per year", { required: true, methods: ["direct-use"] }),
    field("intensityUnit", "Intensity unit", { type: "select", options: ["kWh / year", "Litres / year", "kg GHG / year", "MJ / year"], methods: ["direct-use"] }),
    field("usesPerYear", "Use cycles / year", { optional: true, methods: ["direct-use"] }),
    field("indirectIntensity", "Indirect energy per year", { required: true, methods: ["optional-indirect"] }),
    field("indirectUnit", "Unit", { type: "select", options: ["kWh / year", "MJ / year"], methods: ["optional-indirect"] }),
  ],
  12: [
    field("productName", "Sold product or packaging", { required: true }),
    field("mass", "Mass at end of life", { required: true }),
    field("massUnit", "Mass unit", { type: "select", required: true, options: ["Tonnes", "Kilograms"] }),
    field("treatmentMethod", "Treatment method", { type: "select", required: true, options: TREATMENTS, methods: ["waste-type"] }),
    field("percentToTreatment", "Share to this treatment (%)", { methods: ["waste-type"], placeholder: "0–100" }),
    field("eolRegion", "End-of-life region", { optional: true, methods: ["average-data"] }),
  ],
  13: [
    field("assetName", "Asset leased to others", { required: true, placeholder: "Building, vehicle, equipment…" }),
    field("assetType", "Asset type", { type: "select", options: ["Office", "Warehouse", "Retail", "Vehicle", "Equipment"] }),
    field("lessee", "Lessee", { optional: true, methods: ["asset-specific"] }),
    field("energyCarrier", "Energy type", { type: "select", options: ["Grid electricity", "Natural gas", "Diesel", "Mixed"], methods: ["asset-specific"] }),
    field("energyQuantity", "Energy quantity", { required: true, methods: ["asset-specific"] }),
    field("energyUnit", "Energy unit", { type: "select", options: ENERGY_UNITS, methods: ["asset-specific"] }),
    field("floorArea", "Floor area", { required: true, methods: ["average-data"] }),
    field("areaUnit", "Area unit", { type: "select", options: AREA_UNITS, methods: ["average-data"] }),
  ],
  14: [
    field("franchiseType", "Franchise type", { type: "select", required: true, options: ["QSR / restaurant", "Retail", "Hotel", "Service", "Other"] }),
    field("franchiseeName", "Franchisee", { optional: true, methods: ["franchise-specific"] }),
    field("sites", "Number of sites", { required: true, methods: ["franchise-specific"] }),
    field("energyCarrier", "Energy type", { type: "select", options: ["Grid electricity", "Natural gas", "Mixed"], methods: ["franchise-specific"] }),
    field("energyQuantity", "Energy quantity", { required: true, methods: ["franchise-specific"] }),
    field("energyUnit", "Energy unit", { type: "select", options: ENERGY_UNITS, methods: ["franchise-specific"] }),
    field("numberOfFranchises", "Number of franchises", { required: true, methods: ["average-data"] }),
    field("floorAreaPerSite", "Average floor area / site", { methods: ["average-data"] }),
    field("areaUnit", "Area unit", { type: "select", options: AREA_UNITS, methods: ["average-data"] }),
  ],
  15: [
    field("investeeName", "Investee or project", { required: true, placeholder: "Company, fund, or project name" }),
    field("instrument", "Instrument", { type: "select", options: ["Equity", "Debt", "Project finance"], methods: ["investment-specific"] }),
    field("equityShare", "Equity or ownership share (%)", { required: true, methods: ["investment-specific"] }),
    field("investeeScope1", "Investee scope 1", { required: true, methods: ["investment-specific"] }),
    field("investeeScope2", "Investee scope 2", { required: true, methods: ["investment-specific"] }),
    field("emissionsUnit", "Emissions unit", { type: "select", options: ["tCO2e", "kg CO2e"], methods: ["investment-specific"] }),
    field("investmentValue", "Investment value", { required: true, methods: ["average-data"] }),
    field("currency", "Currency", { type: "select", options: CURRENCIES, methods: ["average-data"] }),
    field("sector", "Sector", { type: "select", options: ["Manufacturing", "Energy", "Real estate", "Financial services", "Other"], methods: ["average-data"] }),
  ],
};

export const SAMPLE_METHODS: Record<number, string> = {
  1: "average-data",
  2: "spend-based",
  3: "average-data",
  4: "distance-based",
  5: "waste-type",
  6: "distance-based",
  7: "average-data",
  8: "average-data",
  9: "distance-based",
  10: "average-data",
  11: "direct-use",
  12: "waste-type",
  13: "average-data",
  14: "average-data",
  15: "average-data",
};

export const SAMPLE_ITEM_VALUES: Record<number, Record<string, string>> = {
  1: {
    item: "Steel (raw material)",
    description: "Used in production",
    quantity: "1,000",
    unit: "Tonnes",
    supplier: "ABC Steel Ltd.",
  },
  2: {
    item: "CNC machining centre",
    assetClass: "Machinery",
    yearAcquired: "2024",
    spend: "18,500,000",
    currency: "INR",
    supplier: "Precision Tools Pvt Ltd",
  },
  3: {
    activityType: "Upstream electricity",
    energyCarrier: "Grid electricity",
    quantity: "2,400,000",
    unit: "kWh",
    gridRegion: "India",
  },
  4: {
    item: "Inbound steel coil",
    cargoMass: "1,000",
    massUnit: "Tonnes",
    distance: "450",
    distanceUnit: "km",
    mode: "Road - HGV",
    origin: "Chennai port",
    destination: "Bengaluru plant",
  },
  5: {
    wasteType: "Mixed industrial",
    quantity: "120",
    unit: "Tonnes",
    treatmentMethod: "Landfill",
  },
  6: {
    item: "Short-haul business flights",
    mode: "Air",
    cabinClass: "Economy",
    distance: "185,000",
    distanceUnit: "pkm",
    trips: "420",
  },
  7: {
    item: "All office employees",
    headcount: "420",
    officeDaysPerWeek: "4",
    region: "Bengaluru",
  },
  8: {
    assetName: "Leased warehouse",
    assetType: "Warehouse",
    floorArea: "",
    areaUnit: "m²",
    buildingType: "Warehouse",
  },
  9: {
    item: "Outbound finished goods",
    productMass: "800",
    massUnit: "Tonnes",
    distance: "1,200",
    distanceUnit: "km",
    mode: "Sea - container",
  },
  10: {
    productName: "Intermediate metal parts",
    quantity: "",
    unit: "Tonnes",
    processType: "Metal forming",
  },
  11: {
    productName: "Industrial pump",
    unitsSold: "3,200",
    lifetimeYears: "10",
    useType: "Electricity consumed in use",
    intensity: "1,800",
    intensityUnit: "kWh / year",
    usesPerYear: "1",
  },
  12: {
    productName: "Sold product and packaging",
    mass: "640",
    massUnit: "Tonnes",
    treatmentMethod: "Recycling",
    percentToTreatment: "40",
  },
  13: {
    assetName: "Asset leased to customers",
    assetType: "Equipment",
    floorArea: "",
    areaUnit: "m²",
  },
  14: {
    franchiseType: "Retail",
    numberOfFranchises: "",
    floorAreaPerSite: "",
    areaUnit: "m²",
  },
  15: {
    investeeName: "Equity holdings outside boundary",
    investmentValue: "",
    currency: "INR",
    sector: "Manufacturing",
  },
};

export function fieldsFor(categoryId: number, method: string) {
  return (CATEGORY_FIELDS[categoryId] ?? []).filter((entry) => !entry.methods || entry.methods.includes(method));
}

export function blankValues(categoryId: number): Record<string, string> {
  return Object.fromEntries((CATEGORY_FIELDS[categoryId] ?? []).map((entry) => [entry.id, ""]));
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
