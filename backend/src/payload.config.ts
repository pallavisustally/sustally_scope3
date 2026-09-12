import path from "path";
import { fileURLToPath } from "url";
import { buildConfig } from "payload";
import { mongooseAdapter } from "@payloadcms/db-mongodb";
import { lexicalEditor } from "@payloadcms/richtext-lexical";
import sharp from "sharp";

import { Users } from "./collections/Users";
import { Companies } from "./collections/Companies";
import { CategorySelections } from "./collections/CategorySelections";
import { ActivityItems } from "./collections/ActivityItems";
import { EmissionFactors } from "./collections/EmissionFactors";
import { InventoryResults } from "./collections/InventoryResults";
import { Reports } from "./collections/Reports";
import { seedEmissionFactors } from "./seed";

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

function originList() {
  const origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3001",
    "https://scope-3-six.vercel.app",
    "https://sustally-scope3.vercel.app",
    "https://backend-theta-one-55.vercel.app",
    process.env.PAYLOAD_PUBLIC_SERVER_URL,
    process.env.FRONTEND_URL,
    process.env.APP_URL,
  ]
    .filter((value): value is string => Boolean(value))
    .map((value) => value.replace(/\/$/, ""));
  return [...new Set(origins)];
}

const origins = originList();

export default buildConfig({
  serverURL: process.env.PAYLOAD_PUBLIC_SERVER_URL || "http://127.0.0.1:3001",
  cors: origins,
  csrf: origins,
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
      importMapFile: path.resolve(dirname, "app/(payload)/admin/importMap.js"),
    },
    meta: {
      titleSuffix: " · Sustally Payload",
    },
  },
  collections: [Users, Companies, CategorySelections, ActivityItems, EmissionFactors, InventoryResults, Reports],
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || "sustally-scope3-dev-secret-change-me",
  typescript: {
    outputFile: path.resolve(dirname, "payload-types.ts"),
  },
  db: mongooseAdapter({
    url: process.env.DATABASE_URI || "",
  }),
  sharp,
  async onInit(payload) {
    await seedEmissionFactors(payload);
  },
});
