import type { CollectionConfig } from "payload";
import { isAdminOrInternal } from "../access";

export const SupplierVerifications: CollectionConfig = {
  slug: "supplier-verifications",
  admin: { useAsTitle: "itemLabel", group: "Inventory", defaultColumns: ["status", "supplierEmail", "categoryId"] },
  access: {
    read: isAdminOrInternal,
    create: isAdminOrInternal,
    delete: isAdminOrInternal,
    update: isAdminOrInternal,
  },
  fields: [
    { name: "company", type: "relationship", relationTo: "companies", required: true, index: true },
    { name: "tokenHash", type: "text", required: true, unique: true, index: true, admin: { hidden: true } },
    { name: "tokenSuffix", type: "text" },
    {
      name: "status",
      type: "select",
      required: true,
      defaultValue: "pending",
      options: [
        { label: "Pending", value: "pending" },
        { label: "Verified", value: "verified" },
        { label: "Superseded", value: "superseded" },
      ],
    },
    { name: "clientItemId", type: "text", required: true, index: true },
    { name: "categoryId", type: "number", required: true },
    { name: "method", type: "text", required: true },
    { name: "supplierEmail", type: "email", required: true },
    { name: "supplierName", type: "text" },
    { name: "itemLabel", type: "text" },
    { name: "sentHash", type: "text" },
    { name: "snapshot", type: "json" },
    { name: "confirmedValues", type: "json" },
    { name: "edited", type: "checkbox", defaultValue: false },
    { name: "verifiedAt", type: "date" },
    { name: "createdBy", type: "text" },
  ],
};
