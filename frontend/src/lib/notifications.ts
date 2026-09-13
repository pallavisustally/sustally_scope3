import type { InventoryResult } from "@/lib/calculate";
import type { InventoryState } from "@/lib/inventory-types";

export type AppNotification = {
  id: string;
  title: string;
  body: string;
  href?: string;
  tone: "info" | "warn" | "ok";
};

export function inventoryNotifications(state: InventoryState, results: InventoryResult): AppNotification[] {
  const notes: AppNotification[] = [];
  const missingFactors = results.categories.flatMap((category) =>
    category.items.filter(
      (item) =>
        item.missing.includes("Emission factor") ||
        item.missing.includes("Supplier-specific emission factor") ||
        item.missing.includes("Secondary emission factor"),
    ),
  );
  if (missingFactors.length) {
    notes.push({
      id: "missing-factors",
      title: "Emission factors unbound",
      body: `${missingFactors.length} activity item${missingFactors.length === 1 ? "" : "s"} still need a factor before emissions calculate.`,
      href: "/activity/factors",
      tone: "warn",
    });
  }

  const incomplete = results.totalItems - results.completeItems;
  if (results.includedCount > 0 && incomplete > 0 && missingFactors.length === 0) {
    notes.push({
      id: "incomplete-items",
      title: "Incomplete activity data",
      body: `${incomplete} item${incomplete === 1 ? "" : "s"} are missing required inputs.`,
      href: "/activity",
      tone: "warn",
    });
  }

  if (results.hasCalculableData) {
    notes.push({
      id: "results-ready",
      title: "Results are live",
      body: "Totals update from the activity data and Payload emission factors in this report.",
      href: "/results",
      tone: "ok",
    });
  } else if (!state.companyName) {
    notes.push({
      id: "start-company",
      title: "Start company setup",
      body: "Add the company name and reporting year to begin saving this report to Payload.",
      href: "/company",
      tone: "info",
    });
  }

  return notes;
}
