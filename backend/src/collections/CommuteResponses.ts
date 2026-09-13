import type { CollectionConfig } from "payload";
import { isAdminOrInternal } from "../access";

export const CommuteResponses: CollectionConfig = {
  slug: "commute-responses",
  admin: { useAsTitle: "id", group: "Inventory", defaultColumns: ["mode", "commuteDays", "submittedAt"] },
  access: {
    read: isAdminOrInternal,
    create: isAdminOrInternal,
    update: isAdminOrInternal,
    delete: isAdminOrInternal,
  },
  fields: [
    { name: "survey", type: "relationship", relationTo: "commute-surveys", required: true, index: true },
    { name: "commuteDays", type: "number", required: true },
    { name: "wfhDays", type: "number", required: true },
    { name: "offDays", type: "number", required: true },
    { name: "mode", type: "text" },
    { name: "oneWayKm", type: "number" },
    { name: "region", type: "text" },
    { name: "workplaceType", type: "text" },
    { name: "submittedAt", type: "date", required: true },
  ],
};
