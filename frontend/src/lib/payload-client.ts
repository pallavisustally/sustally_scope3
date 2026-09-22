import { EMISSION_FACTORS, type EmissionFactor } from "@/data/protocol";
import { stateFromPayload, type CollectionDoc, type SavedInventorySummary } from "@/lib/collections-map";
import type { InventoryState } from "@/lib/inventory-types";
import { COLLECTION_SLUGS, type CollectionSlug } from "@/payload/collections";
import {
  latestVerificationByItem,
  overlayVerificationOnValues,
  type StoredSupplierVerification,
} from "@/lib/supplier-verify";

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
  if (!mapped.length) return EMISSION_FACTORS;
  const ids = new Set(mapped.map((row) => row.id));
  return [...mapped, ...EMISSION_FACTORS.filter((row) => !ids.has(row.id))];
}

export async function listInventories(ownerId: string, currentSessionKey?: string): Promise<SavedInventorySummary[]> {
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
    .filter((doc) => {
      const owner = typeof doc.owner === "string" ? doc.owner : "";
      const sessionKey = typeof doc.sessionKey === "string" ? doc.sessionKey : "";
      if (owner === ownerId) return true;
      if (!owner && currentSessionKey && sessionKey === currentSessionKey) return true;
      return false;
    })
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

export async function loadInventory(sessionKey: string, ownerId: string): Promise<InventoryState | null> {
  const company = await findByField("companies", "sessionKey", sessionKey);
  if (!company?.id) return null;
  const owner = typeof company.owner === "string" ? company.owner : "";
  if (owner && owner !== ownerId) return null;
  const [selections, items] = await Promise.all([
    listByCompany("category-selections", company.id as string | number),
    listByCompany("activity-items", company.id as string | number),
  ]);
  const overlaid = await overlaySavedActivityValues(company.id as string | number, items);
  return stateFromPayload({ sessionKey, company, selections, items: overlaid });
}

export async function listCollection(slug: CollectionSlug, ownerId?: string) {
  if (slug === "emission-factors") return listEmissionFactors();
  if (slug === "companies") return ownerId ? listInventories(ownerId) : [];
  const result = (await payloadRequest(`/${slug}?limit=1000&depth=0`)) as { docs?: Array<Record<string, unknown>> };
  return result.docs ?? [];
}

export async function saveReport(sessionKey: string, data: {
  format: "pdf" | "xlsx";
  includes: string[];
  totalTco2e: number;
  year: number | null;
}, ownerId: string) {
  const company = await findByField("companies", "sessionKey", sessionKey);
  if (!company?.id) throw new Error("Save company details before storing a report.");
  const owner = typeof company.owner === "string" ? company.owner : "";
  if (owner && owner !== ownerId) throw new Error("This report belongs to another account.");
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

export async function saveInventory(next: Snapshot, ownerId: string) {
  const company = next.companies?.[0];
  const sessionKey = typeof company?.sessionKey === "string" ? company.sessionKey : "";
  const companyName = typeof company?.name === "string" ? company.name.trim() : "";
  const included = (next["category-selections"] ?? []).some((row) => row.status === "included");
  if (!sessionKey || (!companyName && !included)) return { payload: false, reason: "empty" as const };

  try {
    const existing = await findByField("companies", "sessionKey", sessionKey);
    const existingOwner = typeof existing?.owner === "string" ? existing.owner : "";
    if (existingOwner && existingOwner !== ownerId) return { payload: false, reason: "forbidden" as const };

    const data = {
      sessionKey,
      owner: ownerId,
      name: companyName || "Untitled company",
      industry: company?.industry ?? "",
      reportingYear: company?.reportingYear ?? null,
      headquarters: company?.headquarters ?? "",
      boundary: company?.boundary ?? "operational",
    };
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
      await overlaySavedActivityValues(
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
      ),
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

function asStringRecord(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, entry == null ? "" : String(entry)]));
}

async function overlaySavedActivityValues(companyId: string | number, rows: Record<string, unknown>[]) {
  const verifications = await listSupplierVerifications(companyId);
  const latest = latestVerificationByItem(verifications.filter((row) => row.status !== "superseded"));
  if (!latest.size) return rows;
  return rows.map((row) => {
    const clientItemId = String(row.clientItemId ?? row.id ?? "");
    const verification = latest.get(clientItemId);
    if (!verification) return row;
    const values = overlayVerificationOnValues(asStringRecord(row.values), verification);
    return { ...row, values, supplier: values.supplier || row.supplier };
  });
}

function relId(value: unknown) {
  if (value && typeof value === "object" && "id" in value) return String((value as { id: unknown }).id);
  return value == null || value === "" ? "" : String(value);
}

function asNumber(value: unknown) {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

export type StoredCommuteSurvey = {
  id: string;
  companyId: string;
  tokenHash: string;
  tokenSuffix: string;
  status: "open" | "closed";
  headcount: number;
  weeksPerYear: number;
  closeAt: string | null;
  reportingYear: number | null;
  createdBy: string;
};

export type StoredCommuteResponse = {
  id: string;
  surveyId: string;
  commuteDays: number;
  wfhDays: number;
  offDays: number;
  mode: string;
  oneWayKm: number | null;
  region: string;
  workplaceType: string;
  submittedAt: string;
};

function mapSurvey(doc: Record<string, unknown>): StoredCommuteSurvey | null {
  const id = doc.id == null ? "" : String(doc.id);
  const tokenHash = typeof doc.tokenHash === "string" ? doc.tokenHash : "";
  if (!id || !tokenHash) return null;
  return {
    id,
    companyId: relId(doc.company),
    tokenHash,
    tokenSuffix: typeof doc.tokenSuffix === "string" ? doc.tokenSuffix : "",
    status: doc.status === "closed" ? "closed" : "open",
    headcount: asNumber(doc.headcount),
    weeksPerYear: asNumber(doc.weeksPerYear) || 48,
    closeAt: typeof doc.closeAt === "string" ? doc.closeAt : null,
    reportingYear: doc.reportingYear == null || doc.reportingYear === "" ? null : asNumber(doc.reportingYear),
    createdBy: typeof doc.createdBy === "string" ? doc.createdBy : "",
  };
}

function mapResponse(doc: Record<string, unknown>): StoredCommuteResponse | null {
  const id = doc.id == null ? "" : String(doc.id);
  const surveyId = relId(doc.survey);
  if (!id || !surveyId) return null;
  const km = doc.oneWayKm == null || doc.oneWayKm === "" ? null : asNumber(doc.oneWayKm);
  return {
    id,
    surveyId,
    commuteDays: asNumber(doc.commuteDays),
    wfhDays: asNumber(doc.wfhDays),
    offDays: asNumber(doc.offDays),
    mode: typeof doc.mode === "string" ? doc.mode : "",
    oneWayKm: km,
    region: typeof doc.region === "string" ? doc.region : "",
    workplaceType: typeof doc.workplaceType === "string" ? doc.workplaceType : "",
    submittedAt: typeof doc.submittedAt === "string" ? doc.submittedAt : "",
  };
}

export async function findCompanyForOwner(sessionKey: string, ownerId: string) {
  const company = await findByField("companies", "sessionKey", sessionKey);
  if (!company?.id) return null;
  const owner = typeof company.owner === "string" ? company.owner : "";
  if (owner && owner !== ownerId) return null;
  return company;
}

export async function getCompanyById(id: string) {
  const result = (await payloadRequest(`/companies/${encodeURIComponent(id)}?depth=0`)) as Record<string, unknown>;
  return result?.id ? result : null;
}

export async function createCommuteSurvey(data: {
  companyId: string | number;
  tokenHash: string;
  tokenSuffix: string;
  headcount: number;
  weeksPerYear: number;
  closeAt?: string | null;
  reportingYear?: number | null;
  createdBy: string;
}) {
  const result = (await payloadRequest("/commute-surveys", {
    method: "POST",
    body: JSON.stringify({
      company: data.companyId,
      tokenHash: data.tokenHash,
      tokenSuffix: data.tokenSuffix,
      status: "open",
      headcount: data.headcount,
      weeksPerYear: data.weeksPerYear,
      closeAt: data.closeAt || null,
      reportingYear: data.reportingYear ?? null,
      createdBy: data.createdBy,
    }),
  })) as { doc?: Record<string, unknown> } & Record<string, unknown>;
  const doc = (result.doc ?? result) as Record<string, unknown>;
  const mapped = mapSurvey(doc);
  if (mapped) return mapped;
  if (!doc.id) return null;
  return {
    id: String(doc.id),
    companyId: String(data.companyId),
    tokenHash: data.tokenHash,
    tokenSuffix: data.tokenSuffix,
    status: "open" as const,
    headcount: data.headcount,
    weeksPerYear: data.weeksPerYear,
    closeAt: data.closeAt || null,
    reportingYear: data.reportingYear ?? null,
    createdBy: data.createdBy,
  };
}

export async function listCommuteSurveys(companyId: string | number) {
  const result = (await payloadRequest(
    `/commute-surveys?${new URLSearchParams({
      "where[company][equals]": String(companyId),
      limit: "50",
      sort: "-createdAt",
      depth: "0",
    }).toString()}`,
  )) as { docs?: Array<Record<string, unknown>> };
  return (result.docs ?? []).map(mapSurvey).filter((row): row is StoredCommuteSurvey => Boolean(row));
}

export async function getCommuteSurvey(id: string) {
  const result = (await payloadRequest(`/commute-surveys/${encodeURIComponent(id)}?depth=0`)) as {
    doc?: Record<string, unknown>;
  } & Record<string, unknown>;
  return mapSurvey((result.doc ?? result) as Record<string, unknown>);
}

export async function findCommuteSurveyByTokenHash(tokenHash: string) {
  const doc = await findByField("commute-surveys", "tokenHash", tokenHash);
  return doc ? mapSurvey(doc) : null;
}

export async function updateCommuteSurvey(
  id: string,
  patch: Partial<{ status: "open" | "closed"; headcount: number; weeksPerYear: number; closeAt: string | null }>,
) {
  const result = (await payloadRequest(`/commute-surveys/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  })) as { doc?: Record<string, unknown> };
  return result.doc ? mapSurvey(result.doc) : null;
}

export async function listCommuteResponses(surveyId: string) {
  const result = (await payloadRequest(
    `/commute-responses?${new URLSearchParams({
      "where[survey][equals]": surveyId,
      limit: "10000",
      depth: "0",
    }).toString()}`,
  )) as { docs?: Array<Record<string, unknown>> };
  return (result.docs ?? []).map(mapResponse).filter((row): row is StoredCommuteResponse => Boolean(row));
}

export async function createCommuteResponse(data: {
  surveyId: string;
  commuteDays: number;
  wfhDays: number;
  offDays: number;
  mode: string;
  oneWayKm: number | null;
  region: string;
  workplaceType: string;
}) {
  const result = (await payloadRequest("/commute-responses", {
    method: "POST",
    body: JSON.stringify({
      survey: data.surveyId,
      commuteDays: data.commuteDays,
      wfhDays: data.wfhDays,
      offDays: data.offDays,
      mode: data.mode,
      oneWayKm: data.oneWayKm,
      region: data.region,
      workplaceType: data.workplaceType,
      submittedAt: new Date().toISOString(),
    }),
  })) as { doc?: Record<string, unknown> };
  return result.doc ? mapResponse(result.doc) : null;
}

function mapSupplierVerification(doc: Record<string, unknown>): StoredSupplierVerification | null {
  const id = doc.id == null ? "" : String(doc.id);
  const tokenHash = typeof doc.tokenHash === "string" ? doc.tokenHash : "";
  const clientItemId = typeof doc.clientItemId === "string" ? doc.clientItemId : "";
  if (!id || !tokenHash || !clientItemId) return null;
  const status = doc.status === "verified" || doc.status === "superseded" ? doc.status : "pending";
  return {
    id,
    companyId: relId(doc.company),
    tokenHash,
    tokenSuffix: typeof doc.tokenSuffix === "string" ? doc.tokenSuffix : "",
    status,
    clientItemId,
    categoryId: asNumber(doc.categoryId),
    method: typeof doc.method === "string" ? doc.method : "",
    supplierEmail: typeof doc.supplierEmail === "string" ? doc.supplierEmail : "",
    supplierName: typeof doc.supplierName === "string" ? doc.supplierName : "",
    itemLabel: typeof doc.itemLabel === "string" ? doc.itemLabel : "",
    sentHash: typeof doc.sentHash === "string" ? doc.sentHash : "",
    snapshot: asStringRecord(doc.snapshot),
    confirmedValues: doc.confirmedValues ? asStringRecord(doc.confirmedValues) : null,
    edited: doc.edited === true,
    verifiedAt: typeof doc.verifiedAt === "string" ? doc.verifiedAt : null,
  };
}

export async function listSupplierVerifications(companyId: string | number) {
  const result = (await payloadRequest(
    `/supplier-verifications?${new URLSearchParams({
      "where[company][equals]": String(companyId),
      limit: "200",
      sort: "-updatedAt",
      depth: "0",
    }).toString()}`,
  )) as { docs?: Array<Record<string, unknown>> };
  return (result.docs ?? []).map(mapSupplierVerification).filter((row): row is StoredSupplierVerification => Boolean(row));
}

export async function findSupplierVerificationByTokenHash(tokenHash: string) {
  const doc = await findByField("supplier-verifications", "tokenHash", tokenHash);
  return doc ? mapSupplierVerification(doc) : null;
}

export async function getSupplierVerification(id: string) {
  const result = (await payloadRequest(`/supplier-verifications/${encodeURIComponent(id)}?depth=0`)) as {
    doc?: Record<string, unknown>;
  } & Record<string, unknown>;
  return mapSupplierVerification((result.doc ?? result) as Record<string, unknown>);
}

export async function createSupplierVerification(data: {
  companyId: string | number;
  tokenHash: string;
  tokenSuffix: string;
  clientItemId: string;
  categoryId: number;
  method: string;
  supplierEmail: string;
  supplierName: string;
  itemLabel: string;
  sentHash: string;
  snapshot: Record<string, string>;
  createdBy: string;
}) {
  const result = (await payloadRequest("/supplier-verifications", {
    method: "POST",
    body: JSON.stringify({
      company: data.companyId,
      tokenHash: data.tokenHash,
      tokenSuffix: data.tokenSuffix,
      status: "pending",
      clientItemId: data.clientItemId,
      categoryId: data.categoryId,
      method: data.method,
      supplierEmail: data.supplierEmail,
      supplierName: data.supplierName,
      itemLabel: data.itemLabel,
      sentHash: data.sentHash,
      snapshot: data.snapshot,
      edited: false,
      createdBy: data.createdBy,
    }),
  })) as { doc?: Record<string, unknown> } & Record<string, unknown>;
  return mapSupplierVerification((result.doc ?? result) as Record<string, unknown>);
}

export async function updateSupplierVerification(
  id: string,
  patch: Partial<{
    status: "pending" | "verified" | "superseded";
    confirmedValues: Record<string, string>;
    edited: boolean;
    verifiedAt: string | null;
  }>,
) {
  const result = (await payloadRequest(`/supplier-verifications/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  })) as { doc?: Record<string, unknown> };
  return result.doc ? mapSupplierVerification(result.doc) : null;
}

export async function supersedePendingVerifications(companyId: string | number, clientItemId: string, exceptId?: string) {
  const rows = await listSupplierVerifications(companyId);
  for (const row of rows) {
    if (row.clientItemId !== clientItemId || row.id === exceptId) continue;
    if (row.status === "superseded") continue;
    await updateSupplierVerification(row.id, { status: "superseded" });
  }
}

export async function applyVerifiedValuesToActivityItem(input: {
  companyId: string | number;
  clientItemId: string;
  values: Record<string, string>;
}) {
  const items = await listByCompany("activity-items", input.companyId);
  const match = items.find((row) => String(row.clientItemId ?? "") === input.clientItemId);
  if (!match?.id) return false;
  const values = { ...asStringRecord(match.values), ...input.values };
  await payloadRequest(`/activity-items/${encodeURIComponent(String(match.id))}`, {
    method: "PATCH",
    body: JSON.stringify({
      values,
      supplier: values.supplier || match.supplier || "",
      item: values.item || match.item || "",
      quantity: values.quantity || match.quantity || "",
      unit: values.unit || match.unit || "",
    }),
  });
  return true;
}

export function snapshotFromBody(body: Record<string, CollectionDoc[]>): Snapshot {
  const next: Snapshot = {};
  for (const [slug, docs] of Object.entries(body)) {
    if (isCollectionSlug(slug) && Array.isArray(docs)) next[slug] = docs;
  }
  return next;
}
