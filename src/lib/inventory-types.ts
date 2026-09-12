import type { Inclusion } from "@/data/protocol";

export type ActivityItem = {
  id: string;
  values: Record<string, string>;
  factorId: string;
  secondaryFactorId: string;
};

export type CategoryStep = "activity" | "method" | "factors";

export type CategoryEntry = {
  method: string;
  items: ActivityItem[];
  activityDone?: boolean;
  methodDone?: boolean;
  factorsDone?: boolean;
};

export type InventoryState = {
  sessionKey: string;
  companyName: string;
  industry: string;
  year: string;
  hq: string;
  boundary: "operational" | "financial" | "equity";
  categories: Record<number, Inclusion>;
  justifications: Record<number, string>;
  activeCategoryId: number;
  entries: Record<number, CategoryEntry>;
};
