import type { CollectionConfig } from "payload";
import { isAdminOrInternal } from "../access";

export const CategorySelections: CollectionConfig = {
  slug: "category-selections",
  admin: { useAsTitle: "categoryId", group: "Inventory", defaultColumns: ["categoryId", "status", "company"] },
  access: {
    read: isAdminOrInternal,
    create: isAdminOrInternal,
    update: isAdminOrInternal,
    delete: isAdminOrInternal,
  },
  fields: [
    { name: "company", type: "relationship", relationTo: "companies", required: true },
    { name: "categoryId", type: "number", required: true },
    {
      name: "status",
      type: "select",
      required: true,
      options: [
        { label: "Included", value: "included" },
        { label: "Not applicable", value: "not_applicable" },
        { label: "Excluded", value: "excluded" },
      ],
    },
    { name: "justification", type: "textarea" },
  ],
};
