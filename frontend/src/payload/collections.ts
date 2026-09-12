/**
 * Payload CMS collection schemas. The session store and API use these slugs
 * and fields as the database shape for the working inventory.
 */

export const payloadCollections = [
  {
    slug: "users",
    auth: true,
    fields: [
      { name: "name", type: "text" },
      { name: "email", type: "email", required: true },
      { name: "role", type: "select", options: ["analyst", "admin"] },
    ],
  },
  {
    slug: "companies",
    fields: [
      { name: "sessionKey", type: "text" },
      { name: "name", type: "text", required: true },
      { name: "industry", type: "text" },
      { name: "reportingYear", type: "number" },
      { name: "headquarters", type: "text" },
      { name: "boundary", type: "select", options: ["operational", "financial", "equity"] },
    ],
  },
  {
    slug: "category-selections",
    fields: [
      { name: "company", type: "relationship", relationTo: "companies" },
      { name: "categoryId", type: "number", required: true },
      { name: "status", type: "select", options: ["included", "not_applicable", "excluded"] },
      { name: "justification", type: "textarea" },
    ],
  },
  {
    slug: "activity-items",
    fields: [
      { name: "company", type: "relationship", relationTo: "companies" },
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
  },
  {
    slug: "emission-factors",
    fields: [
      { name: "code", type: "text", required: true },
      { name: "value", type: "text", required: true },
      { name: "unit", type: "text", required: true },
      { name: "source", type: "text" },
      { name: "year", type: "text" },
      { name: "region", type: "text" },
      { name: "factorType", type: "text" },
      { name: "gwp", type: "text" },
      { name: "origin", type: "select", options: ["primary", "secondary"] },
      { name: "categories", type: "json" },
    ],
  },
  {
    slug: "inventory-results",
    fields: [
      { name: "company", type: "relationship", relationTo: "companies" },
      { name: "year", type: "number" },
      { name: "totalTco2e", type: "number" },
      { name: "byCategory", type: "json" },
      { name: "dataQualityPct", type: "number" },
    ],
  },
  {
    slug: "reports",
    fields: [
      { name: "company", type: "relationship", relationTo: "companies" },
      { name: "year", type: "number" },
      { name: "format", type: "select", options: ["pdf", "xlsx"] },
      { name: "includes", type: "json" },
      { name: "totalTco2e", type: "number" },
    ],
  },
] as const;

export const COLLECTION_SLUGS = payloadCollections.map((collection) => collection.slug);

export type CollectionSlug = (typeof payloadCollections)[number]["slug"];
