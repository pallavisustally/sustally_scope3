import type { CollectionConfig } from "payload";
import { isAdminOrInternal } from "../access";

export const ActivityItems: CollectionConfig = {
  slug: "activity-items",
  admin: { useAsTitle: "item", group: "Inventory", defaultColumns: ["item", "categoryId", "method", "quantity"] },
  access: {
    read: isAdminOrInternal,
    create: isAdminOrInternal,
    update: isAdminOrInternal,
    delete: isAdminOrInternal,
  },
  fields: [
    { name: "company", type: "relationship", relationTo: "companies", required: true },
    { name: "categoryId", type: "number", required: true },
    { name: "method", type: "text", required: true },
    { name: "clientItemId", type: "text" },
    { name: "factorCode", type: "text" },
    { name: "factorCodeSecondary", type: "text" },
    { name: "item", type: "text" },
    { name: "quantity", type: "text" },
    { name: "unit", type: "text" },
    { name: "spend", type: "text" },
    { name: "supplier", type: "text" },
    { name: "values", type: "json" },
  ],
};
