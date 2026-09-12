import type { Access, CollectionConfig } from "payload";
import { isAdminOrInternal } from "../access";

const canCreateUser: Access = async ({ req }) => {
  const allowed = await isAdminOrInternal({ req });
  if (allowed) return true;
  const existing = await req.payload.find({ collection: "users", limit: 1 });
  return existing.totalDocs === 0;
};

export const Users: CollectionConfig = {
  slug: "users",
  auth: true,
  admin: { useAsTitle: "email", group: "Admin" },
  access: {
    read: isAdminOrInternal,
    create: canCreateUser,
    update: isAdminOrInternal,
    delete: isAdminOrInternal,
  },
  fields: [
    { name: "name", type: "text" },
    {
      name: "role",
      type: "select",
      options: [
        { label: "Analyst", value: "analyst" },
        { label: "Admin", value: "admin" },
      ],
      defaultValue: "analyst",
    },
  ],
};
