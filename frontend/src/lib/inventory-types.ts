import type { Inclusion } from "@/data/protocol";

export type ActivityItem = {
  id: string;
  values: Record<string, string>;
  factorId: string;
  secondaryFactorId: string;
};

export type CategoryStep = "activity" | "method" | "factors";

export type CommuteSource = "survey" | "manual";
export type CommuteRemainder = "proportional" | "manual" | "responses-only";

export type CategoryEntry = {
  method: string;
  items: ActivityItem[];
  itemsByMethod?: Record<string, ActivityItem[]>;
  activityDone?: boolean;
  methodDone?: boolean;
  factorsDone?: boolean;
  commuteSource?: CommuteSource;
  commuteRemainder?: CommuteRemainder;
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
