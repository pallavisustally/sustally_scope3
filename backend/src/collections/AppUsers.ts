import type { CollectionConfig } from "payload";
import { isAdminOrInternal } from "../access";

export const AppUsers: CollectionConfig = {
  slug: "app-users",
  admin: { useAsTitle: "email", group: "Admin", description: "Frontend sign-in accounts." },
  access: {
    read: isAdminOrInternal,
    create: isAdminOrInternal,
    update: isAdminOrInternal,
    delete: isAdminOrInternal,
  },
  fields: [
    { name: "firstName", type: "text", required: true },
    { name: "lastName", type: "text", required: true },
    { name: "email", type: "email", required: true, unique: true },
    { name: "phone", type: "text", required: true, unique: true },
    { name: "passwordHash", type: "text", required: true, admin: { hidden: true } },
    { name: "passwordSalt", type: "text", required: true, admin: { hidden: true } },
    { name: "resetTokenHash", type: "text", admin: { hidden: true } },
    { name: "resetExpires", type: "number", admin: { hidden: true } },
  ],
};
