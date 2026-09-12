const FX_TO_USD: Record<string, Record<string, number>> = {
  "2022": { USD: 1, EUR: 1.05, GBP: 1.24, INR: 0.0127 },
  "2023": { USD: 1, EUR: 1.08, GBP: 1.24, INR: 0.0121 },
  "2024": { USD: 1, EUR: 1.08, GBP: 1.28, INR: 0.012 },
  "2025": { USD: 1, EUR: 1.08, GBP: 1.27, INR: 0.0115 },
};

const DEFAULT_YEAR = "2024";

export function factorCurrency(unit: string): string | null {
  const match = unit.toUpperCase().match(/\b(USD|EUR|GBP|INR)\b/);
  return match?.[1] ?? null;
}

export function isSpendFactor(unit: string) {
  return factorCurrency(unit) != null;
}

function usdRate(currency: string, year: string) {
  const table = FX_TO_USD[year] ?? FX_TO_USD[DEFAULT_YEAR];
  return table[currency.toUpperCase()];
}

export function convertSpend(
  amount: number,
  fromCurrency: string,
  toCurrency: string,
  reportingYear: string,
  overrideRate?: number | null,
): { amount: number; rate: number; from: string; to: string } | null {
  const from = fromCurrency.trim().toUpperCase();
  const to = toCurrency.trim().toUpperCase();
  if (!from || !to) return null;
  if (from === to) return { amount, rate: 1, from, to };
  if (overrideRate != null && overrideRate > 0) {
    return { amount: amount * overrideRate, rate: overrideRate, from, to };
  }
  const year = reportingYear.trim() || DEFAULT_YEAR;
  const fromUsd = usdRate(from, year);
  const toUsd = usdRate(to, year);
  if (fromUsd == null || toUsd == null || toUsd === 0) return null;
  const rate = fromUsd / toUsd;
  return { amount: amount * rate, rate, from, to };
}

export function fxNote(year: string) {
  return `Spend is converted into the factor currency using ${year || DEFAULT_YEAR} average FX rates (USD, EUR, GBP, INR). Enter a custom FX rate on the item to override.`;
}
