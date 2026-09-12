import type { CollectionConfig } from "payload";
import { isAdminOrInternal } from "../access";

export const Companies: CollectionConfig = {
  slug: "companies",
  admin: { useAsTitle: "name", group: "Inventory" },
  access: {
    read: isAdminOrInternal,
    create: isAdminOrInternal,
    update: isAdminOrInternal,
    delete: isAdminOrInternal,
  },
  fields: [
    { name: "sessionKey", type: "text", unique: true, admin: { description: "Browser session that created this company." } },
    { name: "name", type: "text", required: true },
    { name: "industry", type: "text" },
    { name: "reportingYear", type: "number" },
    { name: "headquarters", type: "text" },
    {
      name: "boundary",
      type: "select",
      options: [
        { label: "Operational control", value: "operational" },
        { label: "Financial control", value: "financial" },
        { label: "Equity share", value: "equity" },
      ],
    },
  ],
};
