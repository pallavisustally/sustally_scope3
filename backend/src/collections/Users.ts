import type { Access, AuthStrategy, CollectionConfig } from "payload";
import { isAdminOrInternal, requestHasInternalSecret } from "../access";

const internalSecretStrategy: AuthStrategy = {
  name: "internal-secret",
  authenticate: async ({ headers, payload }) => {
    if (!requestHasInternalSecret(headers, payload.secret)) return { user: null };
    const existing = await payload.find({
      collection: "users",
      depth: 0,
      limit: 1,
      overrideAccess: true,
      pagination: false,
    });
    const doc = existing.docs[0];
    if (doc) {
      return { user: { ...doc, collection: "users", _strategy: "internal-secret" } };
    }
    return {
      user: {
        id: "internal",
        collection: "users",
        email: "internal@sustally.local",
        _strategy: "internal-secret",
      },
    };
  },
};

const canCreateUser: Access = async ({ req }) => {
  const allowed = await isAdminOrInternal({ req });
  if (allowed) return true;
  const existing = await req.payload.find({ collection: "users", limit: 1, overrideAccess: true });
  return existing.totalDocs === 0;
};

export const Users: CollectionConfig = {
  slug: "users",
  auth: {
    strategies: [internalSecretStrategy],
  },
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
