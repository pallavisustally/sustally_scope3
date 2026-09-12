import type { CollectionConfig } from "payload";
import { isAdminOrInternal } from "../access";

export const Reports: CollectionConfig = {
  slug: "reports",
  admin: { useAsTitle: "id", group: "Inventory" },
  access: {
    read: isAdminOrInternal,
    create: isAdminOrInternal,
    update: isAdminOrInternal,
    delete: isAdminOrInternal,
  },
  fields: [
    { name: "company", type: "relationship", relationTo: "companies", required: true },
    { name: "year", type: "number" },
    {
      name: "format",
      type: "select",
      options: [
        { label: "PDF", value: "pdf" },
        { label: "Excel", value: "xlsx" },
      ],
    },
    { name: "includes", type: "json" },
    { name: "totalTco2e", type: "number" },
  ],
};
