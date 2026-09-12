import type { Payload } from "payload";

const FACTORS = [
  { code: "1", value: "1.90", unit: "kg CO2e / kg", source: "DEFRA", year: "2024", region: "Global", factorType: "Cradle-to-gate", categories: [1, 2] },
  { code: "2", value: "2.10", unit: "kg CO2e / kg", source: "ecoinvent", year: "2023", region: "Global", factorType: "Cradle-to-gate", categories: [1, 2] },
  { code: "3", value: "2.35", unit: "kg CO2e / kg", source: "US EPA", year: "2023", region: "United States", factorType: "Cradle-to-gate", categories: [1, 2] },
  { code: "4", value: "1.85", unit: "kg CO2e / kg", source: "IEA", year: "2023", region: "Global", factorType: "Cradle-to-gate", categories: [1, 2] },
  { code: "eeio-metals", value: "1.12", unit: "kg CO2e / USD", source: "EEIO", year: "2023", region: "Global", factorType: "Basic metals spend", categories: [1, 2] },
  { code: "eeio-services", value: "0.19", unit: "kg CO2e / USD", source: "EEIO", year: "2023", region: "Global", factorType: "Professional services spend", categories: [1, 2] },
  { code: "c3-wtt", value: "0.61", unit: "kg CO2e / litre", source: "DEFRA", year: "2024", region: "Global", factorType: "Well-to-tank", categories: [3] },
  { code: "c3-td", value: "0.018", unit: "kg CO2e / kWh", source: "IEA", year: "2023", region: "India", factorType: "T&D loss", categories: [3] },
  { code: "c3-gas", value: "0.34", unit: "kg CO2e / kWh", source: "DEFRA", year: "2024", region: "Global", factorType: "Upstream natural gas", categories: [3] },
  { code: "c4-road", value: "0.107", unit: "kg CO2e / tkm", source: "DEFRA", year: "2024", region: "Global", factorType: "HGV average", categories: [4, 9] },
  { code: "c4-sea", value: "0.016", unit: "kg CO2e / tkm", source: "DEFRA", year: "2024", region: "Global", factorType: "Container ship", categories: [4, 9] },
  { code: "c4-air", value: "1.26", unit: "kg CO2e / tkm", source: "DEFRA", year: "2024", region: "Global", factorType: "Air freight", categories: [4, 9] },
  { code: "c4-rail", value: "0.028", unit: "kg CO2e / tkm", source: "DEFRA", year: "2024", region: "Global", factorType: "Rail freight", categories: [4, 9] },
  { code: "c4-diesel", value: "2.68", unit: "kg CO2e / litre", source: "DEFRA", year: "2024", region: "Global", factorType: "Diesel combustion", categories: [4, 6, 7] },
  { code: "eeio-freight", value: "0.42", unit: "kg CO2e / USD", source: "EEIO", year: "2023", region: "Global", factorType: "Transport spend", categories: [4, 9] },
  { code: "c5-landfill", value: "467", unit: "kg CO2e / tonne", source: "DEFRA", year: "2024", region: "Global", factorType: "Landfill mixed", categories: [5, 12] },
  { code: "c5-recycle", value: "21", unit: "kg CO2e / tonne", source: "DEFRA", year: "2024", region: "Global", factorType: "Recycling", categories: [5, 12] },
  { code: "c5-incineration", value: "21.3", unit: "kg CO2e / tonne", source: "DEFRA", year: "2024", region: "Global", factorType: "Incineration", categories: [5, 12] },
  { code: "c6-air", value: "0.156", unit: "kg CO2e / pkm", source: "DEFRA", year: "2024", region: "Global", factorType: "Short-haul economy", categories: [6] },
  { code: "c6-rail", value: "0.035", unit: "kg CO2e / pkm", source: "DEFRA", year: "2024", region: "Global", factorType: "National rail", categories: [6, 7] },
  { code: "c6-car", value: "0.171", unit: "kg CO2e / km", source: "DEFRA", year: "2024", region: "Global", factorType: "Average car", categories: [6, 7] },
  { code: "eeio-travel", value: "0.18", unit: "kg CO2e / USD", source: "EEIO", year: "2023", region: "Global", factorType: "Travel spend", categories: [6] },
  { code: "c7-avg", value: "1.40", unit: "tCO2e / employee", source: "US EPA", year: "2023", region: "Global", factorType: "Average commute", categories: [7] },
  { code: "c8-office", value: "85", unit: "kg CO2e / m²", source: "CRREM", year: "2024", region: "India", factorType: "Office energy", categories: [8, 13, 14] },
  { code: "c8-warehouse", value: "42", unit: "kg CO2e / m²", source: "CRREM", year: "2024", region: "India", factorType: "Warehouse energy", categories: [8, 9, 13, 14] },
  { code: "c8-grid", value: "0.71", unit: "kg CO2e / kWh", source: "CEA", year: "2024", region: "India", factorType: "Grid electricity", categories: [3, 8, 9, 11, 13, 14] },
  { code: "c10-process", value: "0.45", unit: "kg CO2e / kg", source: "ecoinvent", year: "2023", region: "Global", factorType: "Intermediate processing", categories: [10] },
  { code: "c11-grid", value: "0.71", unit: "kg CO2e / kWh", source: "CEA", year: "2024", region: "India", factorType: "Use-phase electricity", categories: [11] },
  { code: "c11-fuel", value: "2.31", unit: "kg CO2e / litre", source: "DEFRA", year: "2024", region: "Global", factorType: "Use-phase petrol", categories: [11] },
  { code: "c15-mfg", value: "0.28", unit: "kg CO2e / USD", source: "EEIO", year: "2023", region: "Global", factorType: "Manufacturing sector", categories: [15] },
  { code: "c15-energy", value: "0.61", unit: "kg CO2e / USD", source: "EEIO", year: "2023", region: "Global", factorType: "Energy sector", categories: [15] },
];

export async function seedEmissionFactors(payload: Payload) {
  const existing = await payload.find({ collection: "emission-factors", limit: 1 });
  if (existing.totalDocs > 0) return;
  for (const factor of FACTORS) {
    await payload.create({
      collection: "emission-factors",
      data: { ...factor, origin: "secondary" },
    });
  }
}
