export type Stream = "upstream" | "downstream";
export type Inclusion = "included" | "not_applicable" | "excluded";

export type Scope3Category = {
  id: number;
  name: string;
  stream: Stream;
  summary: string;
  methods: { id: string; label: string; detail: string }[];
};

export const SCOPE3_CATEGORIES: Scope3Category[] = [
  {
    id: 1,
    name: "Purchased goods and services",
    stream: "upstream",
    summary: "Cradle-to-gate emissions of purchased goods and services not in categories 2–8.",
    methods: [
      { id: "supplier-specific", label: "Supplier-specific", detail: "Product-level cradle-to-gate data from the supplier." },
      { id: "hybrid", label: "Hybrid", detail: "Supplier activity data with secondary data to fill gaps." },
      { id: "average-data", label: "Average-data", detail: "Physical quantity multiplied by industry-average factors." },
      { id: "spend-based", label: "Spend-based", detail: "Economic value multiplied by EEIO emission factors." },
    ],
  },
  {
    id: 2,
    name: "Capital goods",
    stream: "upstream",
    summary: "Cradle-to-gate emissions of capital goods in the year of acquisition. Do not depreciate.",
    methods: [
      { id: "supplier-specific", label: "Supplier-specific", detail: "Supplier product-level cradle-to-gate data." },
      { id: "hybrid", label: "Hybrid", detail: "Supplier activity data with secondary data to fill gaps." },
      { id: "average-data", label: "Average-data", detail: "Mass or units multiplied by average factors." },
      { id: "spend-based", label: "Spend-based", detail: "Spend multiplied by EEIO factors." },
    ],
  },
  {
    id: 3,
    name: "Fuel- and energy-related activities",
    stream: "upstream",
    summary: "Upstream fuels, upstream electricity, T&D losses, and electricity purchased for resale. Combustion stays in scope 1 or 2.",
    methods: [
      { id: "supplier-specific", label: "Supplier-specific", detail: "Fuel- or utility-specific upstream emission factors." },
      { id: "average-data", label: "Average-data", detail: "Average upstream factors per unit of fuel or energy." },
    ],
  },
  {
    id: 4,
    name: "Upstream transportation and distribution",
    stream: "upstream",
    summary: "Third-party inbound, outbound paid by you, and inter-facility transport and storage.",
    methods: [
      { id: "fuel-based", label: "Fuel-based", detail: "Fuel consumed by carriers multiplied by fuel emission factors." },
      { id: "distance-based", label: "Distance-based", detail: "Mass, distance, and mode multiplied by transport factors." },
      { id: "spend-based", label: "Spend-based", detail: "Amount spent on transport multiplied by EEIO factors." },
    ],
  },
  {
    id: 5,
    name: "Waste generated in operations",
    stream: "upstream",
    summary: "Third-party disposal and treatment of waste from operations.",
    methods: [
      { id: "supplier-specific", label: "Supplier-specific", detail: "Emissions data from the waste treatment provider." },
      { id: "waste-type", label: "Waste-type", detail: "Waste by type and treatment method with specific factors." },
      { id: "average-data", label: "Average-data", detail: "Total waste with average treatment factors." },
    ],
  },
  {
    id: 6,
    name: "Business travel",
    stream: "upstream",
    summary: "Employee business travel in vehicles not owned or operated by the company.",
    methods: [
      { id: "fuel-based", label: "Fuel-based", detail: "Fuel use by travel mode." },
      { id: "distance-based", label: "Distance-based", detail: "Distance by mode, class, or vehicle type." },
      { id: "spend-based", label: "Spend-based", detail: "Amount spent on travel by mode." },
    ],
  },
  {
    id: 7,
    name: "Employee commuting",
    stream: "upstream",
    summary: "Home-to-work travel in vehicles not owned or operated by the company.",
    methods: [
      { id: "fuel-based", label: "Fuel-based", detail: "Fuel use from employee surveys." },
      { id: "distance-based", label: "Distance-based", detail: "Distance and mode from employee surveys." },
      { id: "average-data", label: "Average-data", detail: "Headcount with average commuting factors." },
    ],
  },
  {
    id: 8,
    name: "Upstream leased assets",
    stream: "upstream",
    summary: "Operation of assets you lease, if not already in scope 1 or 2.",
    methods: [
      { id: "asset-specific", label: "Asset-specific", detail: "Energy data from the leased asset." },
      { id: "lessor-specific", label: "Lessor-specific", detail: "Allocated energy data from the lessor." },
      { id: "average-data", label: "Average-data", detail: "Floor area or asset type with average factors." },
    ],
  },
  {
    id: 9,
    name: "Downstream transportation and distribution",
    stream: "downstream",
    summary: "Transport and storage of sold products after the point of sale, if not paid by you.",
    methods: [
      { id: "site-specific", label: "Site-specific", detail: "Energy data from distribution sites." },
      { id: "distance-based", label: "Distance-based", detail: "Mass, distance, and mode." },
      { id: "average-data", label: "Average-data", detail: "Average distribution factors." },
    ],
  },
  {
    id: 10,
    name: "Processing of sold products",
    stream: "downstream",
    summary: "Downstream processing of intermediate products sold in the reporting year.",
    methods: [
      { id: "site-specific", label: "Site-specific", detail: "Energy data from downstream processors." },
      { id: "average-data", label: "Average-data", detail: "Industry-average processing factors." },
    ],
  },
  {
    id: 11,
    name: "Use of sold products",
    stream: "downstream",
    summary: "Direct use-phase emissions over the expected lifetime of products sold this year.",
    methods: [
      { id: "direct-use", label: "Direct use-phase", detail: "Energy, fuel, or GHG released during product use." },
      { id: "optional-indirect", label: "Indirect use-phase (optional)", detail: "Indirect energy consumed during use." },
    ],
  },
  {
    id: 12,
    name: "End-of-life treatment of sold products",
    stream: "downstream",
    summary: "Waste treatment of products sold in the reporting year at end of life.",
    methods: [
      { id: "waste-type", label: "Waste-type", detail: "Sold product mass by waste treatment method." },
      { id: "average-data", label: "Average-data", detail: "Average end-of-life treatment factors." },
    ],
  },
  {
    id: 13,
    name: "Downstream leased assets",
    stream: "downstream",
    summary: "Operation of assets you own and lease to others, if not in scope 1 or 2.",
    methods: [
      { id: "asset-specific", label: "Asset-specific", detail: "Energy data from lessees." },
      { id: "average-data", label: "Average-data", detail: "Floor area or asset type with average factors." },
    ],
  },
  {
    id: 14,
    name: "Franchises",
    stream: "downstream",
    summary: "Operation of franchises in the reporting year, reported by the franchisor.",
    methods: [
      { id: "franchise-specific", label: "Franchise-specific", detail: "Energy data from franchisees." },
      { id: "average-data", label: "Average-data", detail: "Average energy intensity by franchise type." },
    ],
  },
  {
    id: 15,
    name: "Investments",
    stream: "downstream",
    summary: "Operation of equity, debt, and project finance not already in scope 1 or 2.",
    methods: [
      { id: "investment-specific", label: "Investment-specific", detail: "Investee scope 1 and 2, proportional to equity." },
      { id: "average-data", label: "Average-data", detail: "Sector average factors for screening investments." },
    ],
  },
];

export type EmissionFactor = {
  id: string;
  factor: string;
  unit: string;
  source: string;
  year: string;
  region: string;
  type: string;
  categories: number[];
};

export const SAMPLE_FACTORS: EmissionFactor[] = [
  { id: "1", factor: "1.90", unit: "kg CO2e / kg", source: "DEFRA", year: "2024", region: "Global", type: "Cradle-to-gate", categories: [1, 2] },
  { id: "2", factor: "2.10", unit: "kg CO2e / kg", source: "ecoinvent", year: "2023", region: "Global", type: "Cradle-to-gate", categories: [1, 2] },
  { id: "3", factor: "2.35", unit: "kg CO2e / kg", source: "US EPA", year: "2023", region: "United States", type: "Cradle-to-gate", categories: [1, 2] },
  { id: "4", factor: "1.85", unit: "kg CO2e / kg", source: "IEA", year: "2023", region: "Global", type: "Cradle-to-gate", categories: [1, 2] },
  { id: "c3-wtt", factor: "0.61", unit: "kg CO2e / litre", source: "DEFRA", year: "2024", region: "Global", type: "Well-to-tank", categories: [3] },
  { id: "c3-td", factor: "0.018", unit: "kg CO2e / kWh", source: "IEA", year: "2023", region: "India", type: "T&D loss", categories: [3] },
  { id: "c4-road", factor: "0.107", unit: "kg CO2e / tkm", source: "DEFRA", year: "2024", region: "Global", type: "HGV average", categories: [4, 9] },
  { id: "c4-sea", factor: "0.016", unit: "kg CO2e / tkm", source: "DEFRA", year: "2024", region: "Global", type: "Container ship", categories: [4, 9] },
  { id: "c5-landfill", factor: "467", unit: "kg CO2e / tonne", source: "DEFRA", year: "2024", region: "Global", type: "Landfill mixed", categories: [5, 12] },
  { id: "c5-recycle", factor: "21", unit: "kg CO2e / tonne", source: "DEFRA", year: "2024", region: "Global", type: "Recycling", categories: [5, 12] },
  { id: "c6-air", factor: "0.156", unit: "kg CO2e / pkm", source: "DEFRA", year: "2024", region: "Global", type: "Short-haul economy", categories: [6] },
  { id: "c6-rail", factor: "0.035", unit: "kg CO2e / pkm", source: "DEFRA", year: "2024", region: "Global", type: "National rail", categories: [6, 7] },
  { id: "c7-avg", factor: "1.40", unit: "tCO2e / employee", source: "US EPA", year: "2023", region: "Global", type: "Average commute", categories: [7] },
  { id: "c8-office", factor: "85", unit: "kg CO2e / m²", source: "CRREM", year: "2024", region: "India", type: "Office energy", categories: [8, 13, 14] },
  { id: "c10-process", factor: "0.45", unit: "kg CO2e / kg", source: "ecoinvent", year: "2023", region: "Global", type: "Intermediate processing", categories: [10] },
  { id: "c11-grid", factor: "0.71", unit: "kg CO2e / kWh", source: "CEA", year: "2024", region: "India", type: "Use-phase electricity", categories: [11] },
  { id: "c15-mfg", factor: "0.28", unit: "kg CO2e / USD", source: "EEIO", year: "2023", region: "Global", type: "Manufacturing sector", categories: [15] },
];

export function getCategory(id: number) {
  return SCOPE3_CATEGORIES.find((category) => category.id === id) ?? SCOPE3_CATEGORIES[0];
}

export function factorsForCategory(id: number) {
  const rows = SAMPLE_FACTORS.filter((row) => row.categories.includes(id));
  return rows.length ? rows : SAMPLE_FACTORS;
}

export function defaultFactorId(id: number) {
  const preferred: Record<number, string> = {
    1: "2",
    2: "2",
    3: "c3-td",
    4: "c4-road",
    5: "c5-landfill",
    6: "c6-air",
    7: "c7-avg",
    8: "c8-office",
    9: "c4-sea",
    10: "c10-process",
    11: "c11-grid",
    12: "c5-recycle",
    13: "c8-office",
    14: "c8-office",
    15: "c15-mfg",
  };
  return preferred[id] ?? factorsForCategory(id)[0]?.id ?? SAMPLE_FACTORS[0].id;
}

export function includedCategories(map: Record<number, Inclusion>) {
  return SCOPE3_CATEGORIES.filter((category) => map[category.id] === "included");
}

export const WIZARD_STEPS = [
  { href: "/activity", label: "Activity Data" },
  { href: "/activity/method", label: "Calculation Method" },
  { href: "/activity/factors", label: "Emission Factors" },
  { href: "/activity/review", label: "Review" },
] as const;

export type NavLeaf = {
  href: string;
  label: string;
  icon: string;
};

export type NavGroup = {
  id: string;
  label: string;
  icon: string;
  children: NavLeaf[];
};

export type NavItem = NavLeaf | NavGroup;

export function isNavGroup(item: NavItem): item is NavGroup {
  return "children" in item;
}

export const NAV_MAIN: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: "/dashboard" },
  {
    id: "setup",
    label: "Setup",
    icon: "/company",
    children: [
      { href: "/company", label: "Company Setup", icon: "/company" },
      { href: "/categories", label: "Scope 3 Categories", icon: "/categories" },
    ],
  },
  {
    id: "activity",
    label: "Data collection",
    icon: "/activity",
    children: [
      { href: "/activity", label: "Activity Data", icon: "/activity" },
      { href: "/activity/method", label: "Calculation Method", icon: "/activity/method" },
      { href: "/activity/factors", label: "Emission Factors", icon: "/activity/factors" },
      { href: "/activity/review", label: "Review", icon: "/activity/review" },
    ],
  },
  {
    id: "reporting",
    label: "Reporting",
    icon: "/reports",
    children: [
      { href: "/results", label: "Results & Analytics", icon: "/results" },
      { href: "/reports", label: "Reports", icon: "/reports" },
    ],
  },
];

export const NAV_FOOTER: NavItem[] = [
  {
    id: "settings",
    label: "Settings",
    icon: "/settings",
    children: [
      { href: "/settings", label: "Display preferences", icon: "/settings" },
      { href: "/help", label: "Help", icon: "/help" },
    ],
  },
];

export function findNavFamily(pathname: string, trees: NavItem[][] = [NAV_MAIN, NAV_FOOTER]): NavGroup | undefined {
  for (const tree of trees) {
    for (const item of tree) {
      if (isNavGroup(item) && item.children.some((child) => child.href === pathname)) {
        return item;
      }
    }
  }
}

export function isGroupActive(pathname: string, group: NavGroup) {
  return group.children.some((child) => child.href === pathname);
}
