import type { CollectionConfig } from "payload";
import { isAdminOrInternal } from "../access";

export const InventoryResults: CollectionConfig = {
  slug: "inventory-results",
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
    { name: "totalTco2e", type: "number" },
    { name: "byCategory", type: "json" },
    { name: "dataQualityPct", type: "number" },
  ],
};
