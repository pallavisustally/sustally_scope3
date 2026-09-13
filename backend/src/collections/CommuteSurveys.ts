import type { CollectionConfig } from "payload";
import { isAdminOrInternal } from "../access";

export const CommuteSurveys: CollectionConfig = {
  slug: "commute-surveys",
  admin: { useAsTitle: "id", group: "Inventory", defaultColumns: ["status", "reportingYear", "headcount"] },
  access: {
    read: isAdminOrInternal,
    create: isAdminOrInternal,
    update: isAdminOrInternal,
    delete: isAdminOrInternal,
  },
  fields: [
    { name: "company", type: "relationship", relationTo: "companies", required: true },
    { name: "tokenHash", type: "text", required: true, unique: true, index: true, admin: { hidden: true } },
    { name: "tokenSuffix", type: "text" },
    {
      name: "status",
      type: "select",
      required: true,
      defaultValue: "open",
      options: [
        { label: "Open", value: "open" },
        { label: "Closed", value: "closed" },
      ],
    },
    { name: "headcount", type: "number", required: true },
    { name: "weeksPerYear", type: "number", defaultValue: 48 },
    { name: "closeAt", type: "date" },
    { name: "reportingYear", type: "number" },
    { name: "createdBy", type: "text" },
  ],
};
