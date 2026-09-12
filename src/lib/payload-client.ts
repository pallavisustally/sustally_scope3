import { EMISSION_FACTORS, type EmissionFactor } from "@/data/protocol";
import { stateFromPayload, type CollectionDoc, type SavedInventorySummary } from "@/lib/collections-map";
import type { InventoryState } from "@/lib/inventory-types";
import { COLLECTION_SLUGS, type CollectionSlug } from "@/payload/collections";

const PAYLOAD_URL = process.env.PAYLOAD_URL || "http://127.0.0.1:3001";
const PAYLOAD_SECRET = process.env.PAYLOAD_SECRET || "sustally-scope3-dev-secret-change-me";

type Snapshot = Partial<Record<CollectionSlug, CollectionDoc[]>>;

export async function pingCms() {
  const adminUrl = `${PAYLOAD_URL.replace(/\/$/, "")}/admin`;
  try {
    const response = await fetch(`${PAYLOAD_URL}/api/users?limit=1&depth=0`, {
      headers: {
        "Content-Type": "application/json",
        "x-payload-secret": PAYLOAD_SECRET,
      },
      cache: "no-store",
      signal: AbortSignal.timeout(2500),
    });
    return {
      ok: response.status < 500,
      adminUrl,
    };
  } catch {
    return { ok: false, adminUrl };
  }
}

async function payloadRequest(path: string, init?: RequestInit) {
  const response = await fetch(`${PAYLOAD_URL}/api${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "x-payload-secret": PAYLOAD_SECRET,
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Payload ${response.status} ${path}: ${text.slice(0, 240)}`);
  }
  return response.json() as Promise<Record<string, unknown>>;
}

async function findByField(slug: string, field: string, value: string) {
  const query = new URLSearchParams({
    [`where[${field}][equals]`]: value,
    limit: "1",
    depth: "0",
  });
  const result = (await payloadRequest(`/${slug}?${query.toString()}`)) as { docs?: Array<Record<string, unknown>> };
  return result.docs?.[0];
}

async function listByCompany(slug: string, companyId: string | number) {
  const query = new URLSearchParams({
    "where[company][equals]": String(companyId),
    limit: "1000",
    depth: "0",
  });
  const result = (await payloadRequest(`/${slug}?${query.toString()}`)) as { docs?: Array<Record<string, unknown>> };
  return result.docs ?? [];
}

async function replaceChildren(slug: string, companyId: string | number, rows: Record<string, unknown>[]) {
  const existing = await listByCompany(slug, companyId);
  for (const row of existing) {
    await payloadRequest(`/${slug}/${row.id}`, { method: "DELETE" });
  }
  for (const row of rows) {
    await payloadRequest(`/${slug}`, {
      method: "POST",
      body: JSON.stringify({ ...row, company: companyId }),
    });
  }
}

function mapFactor(doc: Record<string, unknown>): EmissionFactor | null {
  const id = typeof doc.code === "string" && doc.code ? doc.code : typeof doc.id === "string" ? doc.id : "";
  const factor = typeof doc.value === "string" ? doc.value : typeof doc.factor === "string" ? doc.factor : "";
  const unit = typeof doc.unit === "string" ? doc.unit : "";
  if (!id || !factor || !unit) return null;
  const categories = Array.isArray(doc.categories)
    ? doc.categories.map((entry) => Number(entry)).filter((entry) => Number.isFinite(entry))
    : [];
  return {
    id,
    factor,
    unit,
    source: typeof doc.source === "string" ? doc.source : "",
    year: doc.year == null ? "" : String(doc.year),
    region: typeof doc.region === "string" ? doc.region : "",
    type: typeof doc.factorType === "string" ? doc.factorType : typeof doc.type === "string" ? doc.type : "",
    categories,
  };
}

export function isCollectionSlug(value: string): value is CollectionSlug {
  return (COLLECTION_SLUGS as readonly string[]).includes(value);
}

export async function listEmissionFactors(): Promise<EmissionFactor[]> {
  const result = (await payloadRequest("/emission-factors?limit=1000&depth=0")) as { docs?: Array<Record<string, unknown>> };
  const mapped = (result.docs ?? []).map(mapFactor).filter((row): row is EmissionFactor => Boolean(row));
  return mapped.length ? mapped : EMISSION_FACTORS;
}

export async function listInventories(): Promise<SavedInventorySummary[]> {
  const [companies, results] = await Promise.all([
    payloadRequest("/companies?limit=100&sort=-updatedAt&depth=0") as Promise<{ docs?: Array<Record<string, unknown>> }>,
    payloadRequest("/inventory-results?limit=200&depth=0") as Promise<{ docs?: Array<Record<string, unknown>> }>,
  ]);
  const totals = new Map<string, number>();
  for (const row of results.docs ?? []) {
    const company = row.company;
    const companyId = company && typeof company === "object" && "id" in company ? String(company.id) : String(company ?? "");
    if (!companyId || companyId === "undefined") continue;
    totals.set(companyId, Number(row.totalTco2e) || 0);
  }
  return (companies.docs ?? [])
    .map((doc) => {
      const sessionKey = typeof doc.sessionKey === "string" ? doc.sessionKey : "";
      if (!sessionKey) return null;
      return {
        id: String(doc.id ?? sessionKey),
        sessionKey,
        name: typeof doc.name === "string" && doc.name.trim() ? doc.name : "Untitled company",
        year: doc.reportingYear == null ? "" : String(doc.reportingYear),
        industry: typeof doc.industry === "string" ? doc.industry : "",
        updatedAt: typeof doc.updatedAt === "string" ? doc.updatedAt : "",
        totalTco2e: totals.get(String(doc.id ?? "")) ?? 0,
      };
    })
    .filter((row): row is SavedInventorySummary => Boolean(row));
}

export async function loadInventory(sessionKey: string): Promise<InventoryState | null> {
  const company = await findByField("companies", "sessionKey", sessionKey);
  if (!company?.id) return null;
  const [selections, items] = await Promise.all([
    listByCompany("category-selections", company.id as string | number),
    listByCompany("activity-items", company.id as string | number),
  ]);
  return stateFromPayload({ sessionKey, company, selections, items });
}

export async function listCollection(slug: CollectionSlug) {
  if (slug === "emission-factors") return listEmissionFactors();
  if (slug === "companies") return listInventories();
  const result = (await payloadRequest(`/${slug}?limit=1000&depth=0`)) as { docs?: Array<Record<string, unknown>> };
  return result.docs ?? [];
}

export async function saveReport(sessionKey: string, data: {
  format: "pdf" | "xlsx";
  includes: string[];
  totalTco2e: number;
  year: number | null;
}) {
  const company = await findByField("companies", "sessionKey", sessionKey);
  if (!company?.id) throw new Error("Save company details before storing a report.");
  await payloadRequest("/reports", {
    method: "POST",
    body: JSON.stringify({
      company: company.id,
      year: data.year,
      format: data.format,
      includes: data.includes,
      totalTco2e: data.totalTco2e,
    }),
  });
  return { ok: true, companyId: company.id };
}

export async function saveInventory(next: Snapshot) {
  const company = next.companies?.[0];
  const sessionKey = typeof company?.sessionKey === "string" ? company.sessionKey : "";
  const companyName = typeof company?.name === "string" ? company.name.trim() : "";
  const included = (next["category-selections"] ?? []).some((row) => row.status === "included");
  if (!sessionKey || (!companyName && !included)) return { payload: false, reason: "empty" as const };

  try {
    const data = {
      sessionKey,
      name: companyName || "Untitled company",
      industry: company?.industry ?? "",
      reportingYear: company?.reportingYear ?? null,
      headquarters: company?.headquarters ?? "",
      boundary: company?.boundary ?? "operational",
    };
    const existing = await findByField("companies", "sessionKey", sessionKey);
    const saved = existing
      ? ((await payloadRequest(`/companies/${existing.id}`, { method: "PATCH", body: JSON.stringify(data) })) as { doc?: { id: unknown } }).doc
      : ((await payloadRequest("/companies", { method: "POST", body: JSON.stringify(data) })) as { doc?: { id: unknown } }).doc;
    const companyId = saved?.id ?? existing?.id;
    if (companyId == null) return { payload: false, reason: "no-company" as const };

    await replaceChildren(
      "category-selections",
      companyId as string | number,
      (next["category-selections"] ?? []).map((row) => ({
        categoryId: row.categoryId,
        status: row.status,
        justification: row.justification ?? "",
      })),
    );

    await replaceChildren(
      "activity-items",
      companyId as string | number,
      (next["activity-items"] ?? []).map((row) => ({
        categoryId: row.categoryId,
        method: row.method,
        clientItemId: row.id,
        factorCode: row.factorId ?? "",
        factorCodeSecondary: row.factorCodeSecondary ?? "",
        item: row.item ?? "",
        quantity: row.quantity ?? "",
        unit: row.unit ?? "",
        spend: row.spend ?? "",
        supplier: row.supplier ?? "",
        values: row.values ?? {},
      })),
    );

    const result = next["inventory-results"]?.[0];
    if (result) {
      const existingResult = (await listByCompany("inventory-results", companyId as string | number))[0];
      const resultData = {
        company: companyId,
        year: result.year ?? null,
        totalTco2e: result.totalTco2e ?? 0,
        byCategory: result.byCategory ?? [],
        dataQualityPct: result.dataQualityPct ?? 0,
      };
      if (existingResult) {
        await payloadRequest(`/inventory-results/${existingResult.id}`, { method: "PATCH", body: JSON.stringify(resultData) });
      } else {
        await payloadRequest("/inventory-results", { method: "POST", body: JSON.stringify(resultData) });
      }
    }
    return { payload: true, companyId };
  } catch (error) {
    console.error("Payload save failed", error);
    return { payload: false, reason: "unreachable" as const };
  }
}

export function snapshotFromBody(body: Record<string, CollectionDoc[]>): Snapshot {
  const next: Snapshot = {};
  for (const [slug, docs] of Object.entries(body)) {
    if (isCollectionSlug(slug) && Array.isArray(docs)) next[slug] = docs;
  }
  return next;
}
