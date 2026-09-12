import type { CollectionConfig } from "payload";
import { isAdminOrInternal } from "../access";

export const EmissionFactors: CollectionConfig = {
  slug: "emission-factors",
  admin: { useAsTitle: "code", group: "Reference", defaultColumns: ["code", "value", "unit", "source", "year"] },
  access: {
    read: () => true,
    create: isAdminOrInternal,
    update: isAdminOrInternal,
    delete: isAdminOrInternal,
  },
  fields: [
    { name: "code", type: "text", required: true, unique: true },
    { name: "value", type: "text", required: true },
    { name: "unit", type: "text", required: true },
    { name: "source", type: "text" },
    { name: "year", type: "text" },
    { name: "region", type: "text" },
    { name: "factorType", type: "text" },
    {
      name: "origin",
      type: "select",
      options: [
        { label: "Primary", value: "primary" },
        { label: "Secondary", value: "secondary" },
      ],
      defaultValue: "secondary",
    },
    { name: "categories", type: "json" },
  ],
};
