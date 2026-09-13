import { NextResponse } from "next/server";
import { formatReportingYear } from "@/lib/reporting-year";
import { SCOPE3_CATEGORIES } from "@/data/protocol";
import {
  categoryName,
  publicActivityFields,
  sanitizePublicValues,
  verificationFlags,
} from "@/lib/supplier-verify";
import {
  applyVerifiedValuesToActivityItem,
  findSupplierVerificationByTokenHash,
  getCompanyById,
  getSupplierVerification,
  updateSupplierVerification,
} from "@/lib/payload-client";
import { hashSurveyToken } from "@/lib/survey-token";

export const runtime = "nodejs";

async function loadPublic(token: string) {
  const trimmed = token.trim();
  if (!trimmed) return null;
  const found = await findSupplierVerificationByTokenHash(hashSurveyToken(trimmed));
  if (!found) return null;
  return (await getSupplierVerification(found.id)) ?? found;
}

function publicPayload(row: NonNullable<Awaited<ReturnType<typeof loadPublic>>>, companyName: string, year: string) {
  const values = row.status === "verified" ? row.confirmedValues ?? row.snapshot : row.snapshot;
  const methodLabel = SCOPE3_CATEGORIES.find((category) => category.id === row.categoryId)?.methods.find((method) => method.id === row.method)?.label ?? row.method;
  return {
    companyName: companyName || "a company",
    year,
    categoryId: row.categoryId,
    categoryName: categoryName(row.categoryId),
    method: row.method,
    methodLabel,
    itemLabel: row.itemLabel,
    supplierName: row.supplierName,
    status: row.status,
    fields: publicActivityFields(row.categoryId, row.method).map((field) => ({
      id: field.id,
      label: field.label,
      type: field.type,
      options: field.options ?? [],
      placeholder: field.placeholder ?? "",
      value: values[field.id] ?? "",
    })),
  };
}

export async function GET(_request: Request, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params;
  try {
    const row = await loadPublic(decodeURIComponent(token));
    if (!row) return NextResponse.json({ error: "This confirmation link is not valid." }, { status: 404 });
    const company = await getCompanyById(row.companyId).catch(() => null);
    const companyName = typeof company?.name === "string" ? company.name : "";
    const year = company?.reportingYear ? formatReportingYear(String(company.reportingYear)) : "";
    return NextResponse.json(publicPayload(row, companyName, year));
  } catch {
    return NextResponse.json({ error: "Could not open this confirmation." }, { status: 500 });
  }
}

export async function POST(request: Request, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params;
  try {
    const row = await loadPublic(decodeURIComponent(token));
    if (!row) return NextResponse.json({ error: "This confirmation link is not valid." }, { status: 404 });
    if (row.status === "superseded") {
      return NextResponse.json({ error: "This link was replaced by a newer request." }, { status: 410 });
    }
    if (row.status === "verified") {
      return NextResponse.json({ error: "This data is already confirmed." }, { status: 410 });
    }
    const body = (await request.json().catch(() => ({}))) as { action?: string; values?: Record<string, unknown> };
    const action = body.action === "edit" ? "edit" : "accept";
    const confirmed =
      action === "edit" ? sanitizePublicValues(row.categoryId, row.method, body.values ?? {}, row.snapshot) : { ...row.snapshot };
    const verifiedAt = new Date().toISOString();
    const updated = await updateSupplierVerification(row.id, {
      status: "verified",
      confirmedValues: confirmed,
      edited: action === "edit",
      verifiedAt,
    });
    if (!updated) return NextResponse.json({ error: "Could not save your confirmation." }, { status: 500 });
    await applyVerifiedValuesToActivityItem({
      companyId: row.companyId,
      clientItemId: row.clientItemId,
      values: {
        ...confirmed,
        ...verificationFlags({ ...row, status: "verified", verifiedAt }),
      },
    });
    return NextResponse.json({ ok: true, edited: action === "edit" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not save your confirmation.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
