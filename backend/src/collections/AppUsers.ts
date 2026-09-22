import type { CollectionBeforeChangeHook, CollectionBeforeValidateHook, CollectionConfig } from "payload";
import { isAdminOrInternal } from "../access";
import { hashAppPassword, newAppPasswordSalt } from "../lib/app-password";

function textValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

const applyAdminPassword: CollectionBeforeValidateHook = async ({ data, operation, originalDoc }) => {
  if (!data) return data;

  const password = textValue(data.password);
  delete data.password;

  if (password) {
    if (password.length < 8) {
      throw new Error("Password must be at least 8 characters.");
    }
    const salt = newAppPasswordSalt();
    data.passwordSalt = salt;
    data.passwordHash = await hashAppPassword(password, salt);
    data.resetTokenHash = null;
    data.resetExpires = null;
    return data;
  }

  const existingHash = textValue(originalDoc?.passwordHash) || textValue(data.passwordHash);
  const existingSalt = textValue(originalDoc?.passwordSalt) || textValue(data.passwordSalt);

  if (operation === "create" && (!existingHash || !existingSalt)) {
    throw new Error("Set a password for this app user.");
  }

  if (existingHash) data.passwordHash = existingHash;
  if (existingSalt) data.passwordSalt = existingSalt;
  return data;
};

const stripPlaintextPassword: CollectionBeforeChangeHook = ({ data }) => {
  if (data) delete data.password;
  return data;
};

export const AppUsers: CollectionConfig = {
  slug: "app-users",
  admin: {
    useAsTitle: "email",
    group: "Admin",
    description: "Frontend sign-in accounts. Edit name, email, or phone; set a new password; or delete the user.",
    defaultColumns: ["firstName", "lastName", "email", "phone", "updatedAt"],
  },
  access: {
    read: isAdminOrInternal,
    create: isAdminOrInternal,
    update: isAdminOrInternal,
    delete: isAdminOrInternal,
  },
  hooks: {
    beforeValidate: [applyAdminPassword],
    beforeChange: [stripPlaintextPassword],
  },
  fields: [
    { name: "firstName", type: "text", required: true },
    { name: "lastName", type: "text", required: true },
    { name: "email", type: "email", required: true, unique: true },
    { name: "phone", type: "text", required: true, unique: true },
    {
      name: "password",
      type: "text",
      label: "Password",
      virtual: true,
      admin: {
        description: "Set or reset the sign-in password. Leave blank when editing to keep the current password. Hashes cannot be converted back to the original password.",
      },
    },
    { name: "passwordHash", type: "text", admin: { hidden: true, disableListColumn: true, disableListFilter: true } },
    { name: "passwordSalt", type: "text", admin: { hidden: true, disableListColumn: true, disableListFilter: true } },
    { name: "resetTokenHash", type: "text", admin: { hidden: true, disableListColumn: true, disableListFilter: true } },
    { name: "resetExpires", type: "number", admin: { hidden: true, disableListColumn: true, disableListFilter: true } },
  ],
};
