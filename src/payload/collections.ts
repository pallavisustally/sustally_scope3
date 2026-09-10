/**
 * Payload CMS collections for a later wiring pass.
 * The frontend does not import this file yet. No calculations run against it.
 */

export const payloadCollections = [
  {
    slug: "users",
    auth: true,
    fields: [
      { name: "name", type: "text" },
      { name: "role", type: "select", options: ["analyst", "admin"] },
    ],
  },
  {
    slug: "companies",
    fields: [
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
      { name: "categoryId", type: "number" },
      { name: "method", type: "text" },
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
      { name: "value", type: "text" },
      { name: "unit", type: "text" },
      { name: "source", type: "text" },
      { name: "year", type: "text" },
      { name: "region", type: "text" },
      { name: "factorType", type: "select", options: ["cradle-to-gate", "combustion", "upstream-excluding-combustion"] },
      { name: "gwp", type: "text" },
      { name: "origin", type: "select", options: ["primary", "secondary"] },
    ],
  },
  {
    slug: "reports",
    fields: [
      { name: "company", type: "relationship", relationTo: "companies" },
      { name: "year", type: "number" },
      { name: "format", type: "select", options: ["pdf", "xlsx"] },
      { name: "includes", type: "json" },
    ],
  },
] as const;
