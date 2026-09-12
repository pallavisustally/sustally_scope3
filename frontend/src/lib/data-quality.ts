import type { EmissionFactor } from "@/data/protocol";

export type DqaScores = {
  technology: number;
  time: number;
  geography: number;
  completeness: number;
  reliability: number;
  overall: number;
};

export const DQA_LABELS: { key: keyof Omit<DqaScores, "overall">; label: string }[] = [
  { key: "technology", label: "Technology" },
  { key: "time", label: "Time" },
  { key: "geography", label: "Geography" },
  { key: "completeness", label: "Completeness" },
  { key: "reliability", label: "Reliability" },
];

function clampScore(value: number) {
  return Math.max(1, Math.min(5, Math.round(value)));
}

function technologyScore(method: string) {
  if (["supplier-specific", "site-specific", "asset-specific", "investment-specific", "franchise-specific"].includes(method)) return 5;
  if (["hybrid", "lessor-specific"].includes(method)) return 4;
  if (["average-data", "waste-type", "distance-based", "fuel-based", "direct-use", "optional-indirect"].includes(method)) return 3;
  if (method === "spend-based") return 2;
  return 3;
}

function timeScore(factorYear: string | undefined, reportingYear: string) {
  const factor = Number(factorYear);
  const report = Number(reportingYear);
  if (!Number.isFinite(factor) || !Number.isFinite(report)) return 2;
  const gap = Math.abs(report - factor);
  if (gap === 0) return 5;
  if (gap === 1) return 4;
  if (gap <= 3) return 3;
  if (gap <= 5) return 2;
  return 1;
}

function geographyScore(region: string | undefined, hq: string) {
  const r = (region ?? "").trim().toLowerCase();
  const h = hq.trim().toLowerCase();
  if (!r || r === "global") return 3;
  if (h && (h.includes(r) || r.includes(h) || h.split(/[;,]/).some((part) => part.trim() && r.includes(part.trim())))) return 5;
  const groups = [
    ["india", "south asia", "asia"],
    ["united states", "us", "usa", "north america"],
    ["europe", "eu", "united kingdom", "uk", "germany", "france"],
  ];
  const hit = groups.find((group) => group.some((token) => r.includes(token) || h.includes(token)));
  if (hit && hit.some((token) => r.includes(token)) && hit.some((token) => h.includes(token))) return 4;
  return 2;
}

function completenessScore(complete: boolean, missingCount: number, requiredCount: number) {
  if (complete) return 5;
  if (requiredCount <= 0) return 3;
  const filled = Math.max(0, requiredCount - missingCount);
  return clampScore(1 + (filled / requiredCount) * 4);
}

function reliabilityScore(factor: EmissionFactor | undefined, method: string) {
  const source = (factor?.source ?? "").toLowerCase();
  if (source.includes("supplier") || method === "supplier-specific") return 5;
  if (["defra", "epa", "iea", "ecoinvent", "cea", "crrem"].some((token) => source.includes(token))) return 4;
  if (source.includes("eeio") || method === "spend-based") return 2;
  if (factor) return 3;
  return 1;
}

export function scoreItemDqa(input: {
  method: string;
  complete: boolean;
  missingCount: number;
  requiredCount: number;
  factor?: EmissionFactor;
  secondaryFactor?: EmissionFactor;
  reportingYear: string;
  hq: string;
}): DqaScores {
  const factor = input.factor ?? input.secondaryFactor;
  const technology = technologyScore(input.method);
  const time = timeScore(factor?.year, input.reportingYear);
  const geography = geographyScore(factor?.region, input.hq);
  const completeness = completenessScore(input.complete, input.missingCount, input.requiredCount);
  const reliability = reliabilityScore(factor, input.method);
  const overall = (technology + time + geography + completeness + reliability) / 5;
  return { technology, time, geography, completeness, reliability, overall };
}

export function aggregateDqa(items: Array<{ dqa: DqaScores; tco2e: number }>): DqaScores {
  if (items.length === 0) {
    return { technology: 0, time: 0, geography: 0, completeness: 0, reliability: 0, overall: 0 };
  }
  const weight = items.reduce((sum, item) => sum + (item.tco2e > 0 ? item.tco2e : 0), 0);
  const useEqual = weight <= 0;
  const keys: Array<keyof Omit<DqaScores, "overall">> = ["technology", "time", "geography", "completeness", "reliability"];
  const scores = Object.fromEntries(
    keys.map((key) => {
      if (useEqual) {
        const avg = items.reduce((sum, item) => sum + item.dqa[key], 0) / items.length;
        return [key, avg];
      }
      const weighted = items.reduce((sum, item) => sum + item.dqa[key] * item.tco2e, 0) / weight;
      return [key, weighted];
    }),
  ) as Omit<DqaScores, "overall">;
  const overall = (scores.technology + scores.time + scores.geography + scores.completeness + scores.reliability) / 5;
  return { ...scores, overall };
}

export function dqaPercent(score: number) {
  if (!score) return 0;
  return Math.round((score / 5) * 100);
}
