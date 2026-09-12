import { methodLabel } from "@/data/protocol";

export type CategoryFormula = {
  headline: string;
  methods: { label: string; formula: string }[];
};

export function formulaFor(categoryId: number, methodId: string) {
  const pack = CATEGORY_FORMULAS[categoryId];
  const label = methodLabel(categoryId, methodId);
  if (!pack) {
    return {
      headline: "CO₂e = activity data × emission factor",
      methodLabel: label,
      methodFormula: "quantity × emission factor",
    };
  }
  const needle = label.toLowerCase();
  const match =
    pack.methods.find((row) => row.label.toLowerCase() === needle) ??
    pack.methods.find((row) => needle.includes(row.label.toLowerCase()) || row.label.toLowerCase().includes(needle));
  return {
    headline: pack.headline,
    methodLabel: label,
    methodFormula: match?.formula ?? pack.headline,
  };
}

export const CATEGORY_FORMULAS: Record<number, CategoryFormula> = {
  1: {
    headline: "CO₂e = Σ (activity data × emission factor)",
    methods: [
      { label: "Supplier-specific", formula: "Σ (quantity of good × supplier product cradle-to-gate EF)" },
      { label: "Hybrid", formula: "supplier emissions + Σ (remaining quantity × secondary EF)" },
      { label: "Average-data", formula: "Σ (mass or units × industry-average EF)" },
      { label: "Spend-based", formula: "Σ (amount spent × EEIO EF)" },
    ],
  },
  2: {
    headline: "CO₂e = Σ (capital good acquired this year × EF)  ·  do not depreciate",
    methods: [
      { label: "Supplier-specific", formula: "Σ (quantity of asset × supplier cradle-to-gate EF)" },
      { label: "Hybrid", formula: "supplier emissions + Σ (remaining quantity × secondary EF)" },
      { label: "Average-data", formula: "Σ (mass or units × average capital-good EF)" },
      { label: "Spend-based", formula: "Σ (amount spent × EEIO EF)" },
    ],
  },
  3: {
    headline: "CO₂e = upstream fuel + upstream electricity + T&D losses  ·  combustion stays in scope 1 or 2",
    methods: [
      { label: "Upstream fuels", formula: "Σ (fuel consumed × well-to-tank EF)" },
      { label: "Upstream electricity", formula: "Σ (electricity consumed × upstream generation EF)" },
      { label: "T&D losses", formula: "Σ (electricity consumed × T&D loss factor × grid EF)" },
      { label: "Supplier-specific", formula: "same activity data × fuel- or utility-specific upstream EF" },
    ],
  },
  4: {
    headline: "CO₂e = Σ (transport or storage activity × EF)",
    methods: [
      { label: "Fuel-based", formula: "Σ (fuel consumed by carrier × fuel EF)" },
      { label: "Distance-based", formula: "Σ (mass × distance × mode EF)  =  Σ (tkm × EF)" },
      { label: "Spend-based", formula: "Σ (amount spent on transport or storage × EEIO EF)" },
    ],
  },
  5: {
    headline: "CO₂e = Σ (waste treated by a third party × treatment EF)",
    methods: [
      { label: "Supplier-specific", formula: "emissions reported by the waste treatment provider" },
      { label: "Waste-type", formula: "Σ (mass of waste type × treatment-method EF)" },
      { label: "Average-data", formula: "Σ (total waste mass × average treatment EF)" },
    ],
  },
  6: {
    headline: "CO₂e = Σ (business travel activity × EF)",
    methods: [
      { label: "Fuel-based", formula: "Σ (fuel used by travel mode × fuel EF)" },
      { label: "Distance-based", formula: "Σ (distance × mode/class EF)  =  Σ (pkm × EF)" },
      { label: "Spend-based", formula: "Σ (amount spent by travel mode × EEIO EF)" },
    ],
  },
  7: {
    headline: "CO₂e = Σ (employee commuting activity × EF)",
    methods: [
      { label: "Fuel-based", formula: "Σ (survey fuel use × fuel EF)" },
      { label: "Distance-based", formula: "Σ (employees × commuting days × 2 × one-way km × mode EF)" },
      { label: "Average-data", formula: "Σ (headcount × average commute EF)" },
    ],
  },
  8: {
    headline: "CO₂e = Σ (energy of leased assets not in scope 1 or 2 × EF)",
    methods: [
      { label: "Asset-specific", formula: "Σ (asset energy use × energy EF)" },
      { label: "Lessor-specific", formula: "Σ (allocated lessor energy × energy EF)" },
      { label: "Average-data", formula: "Σ (floor area × average energy intensity EF)" },
    ],
  },
  9: {
    headline: "CO₂e = Σ (downstream transport or storage after sale × EF)",
    methods: [
      { label: "Site-specific", formula: "Σ (distribution-site energy × energy EF)" },
      { label: "Distance-based", formula: "Σ (product mass × distance × mode EF)" },
      { label: "Average-data", formula: "Σ (product quantity × average distribution EF)" },
    ],
  },
  10: {
    headline: "CO₂e = Σ (intermediate product sold × downstream processing EF)",
    methods: [
      { label: "Site-specific", formula: "Σ (processor energy, waste, or process data × EF)" },
      { label: "Average-data", formula: "Σ (mass of sold intermediate × industry-average processing EF)" },
    ],
  },
  11: {
    headline: "CO₂e = Σ (products sold this year × lifetime use × EF)",
    methods: [
      { label: "Direct use-phase", formula: "Σ (units sold × lifetime years × energy or fuel or GHG per year × EF)" },
      { label: "Indirect use-phase", formula: "Σ (units sold × lifetime × indirect energy per year × EF)  ·  optional" },
    ],
  },
  12: {
    headline: "CO₂e = Σ (sold product mass at end of life × treatment EF)",
    methods: [
      { label: "Waste-type", formula: "Σ (mass × share to treatment method × treatment EF)" },
      { label: "Average-data", formula: "Σ (total sold-product mass × average end-of-life EF)" },
    ],
  },
  13: {
    headline: "CO₂e = Σ (energy of assets you lease to others × EF)",
    methods: [
      { label: "Asset-specific", formula: "Σ (lessee energy use × energy EF)" },
      { label: "Average-data", formula: "Σ (floor area or asset count × average intensity EF)" },
    ],
  },
  14: {
    headline: "CO₂e = Σ (franchise operations in the reporting year × EF)",
    methods: [
      { label: "Franchise-specific", formula: "Σ (franchisee energy use × energy EF)" },
      { label: "Average-data", formula: "Σ (number of franchises × average energy intensity EF)" },
    ],
  },
  15: {
    headline: "CO₂e = Σ (investee emissions × your share)",
    methods: [
      { label: "Investment-specific", formula: "Σ ((investee scope 1 + scope 2) × equity or ownership share)" },
      { label: "Average-data", formula: "Σ (investment value × sector EEIO EF)" },
    ],
  },
};
