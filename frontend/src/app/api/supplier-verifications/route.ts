import { NextResponse } from "next/server";
import { formatReportingYear } from "@/lib/reporting-year";
import { sendSupplierVerificationEmail } from "@/lib/mail";
import {
  canVerifySupplierMethod,
  categoryName,
  isValidSupplierEmail,
  snapshotForItem,
} from "@/lib/supplier-verify";
import {
  createSupplierVerification,
  findCompanyForOwner,
  listSupplierVerifications,
  loadInventory,
  supersedePendingVerifications,
} from "@/lib/payload-client";
import { requireUser } from "@/lib/require-user";
import { createSurveyToken } from "@/lib/survey-token";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const auth = await requireUser();
  if (!auth.user) return auth.response;
  const sessionKey = new URL(request.url).searchParams.get("sessionKey") || "";
  if (!sessionKey) return NextResponse.json({ error: "Missing session." }, { status: 400 });
  try {
    const company = await findCompanyForOwner(sessionKey, auth.user.id);
    if (!company?.id) return NextResponse.json({ verifications: [] });
    const rows = await listSupplierVerifications(company.id as string | number);
    return NextResponse.json({
      verifications: rows.filter((row) => row.status !== "superseded"),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load supplier confirmations.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await requireUser();
  if (!auth.user) return auth.response;
  const body = (await request.json().catch(() => ({}))) as {
    sessionKey?: string;
    categoryId?: unknown;
    itemId?: string;
    method?: string;
    values?: Record<string, string>;
  };
  const sessionKey = body.sessionKey?.trim() || "";
  const categoryId = Number(body.categoryId);
  const itemId = body.itemId?.trim() || "";
  if (!sessionKey || !itemId || !Number.isFinite(categoryId)) {
    return NextResponse.json({ error: "Missing item to send." }, { status: 400 });
  }
  try {
    const company = await findCompanyForOwner(sessionKey, auth.user.id);
    if (!company?.id) {
      return NextResponse.json({ error: "Save company setup first, then send this to the supplier." }, { status: 400 });
    }
    const inventory = await loadInventory(sessionKey, auth.user.id);
    const entry = inventory?.entries[categoryId];
    const savedItem = entry?.items.find((row) => row.id === itemId);
    const method = body.method || entry?.method || "";
    const values = body.values && Object.keys(body.values).length ? body.values : savedItem?.values ?? {};
    const item = {
      id: itemId,
      values,
      factorId: savedItem?.factorId ?? "",
      secondaryFactorId: savedItem?.secondaryFactorId ?? "",
    };
    if (!canVerifySupplierMethod(method)) {
      return NextResponse.json({ error: "Supplier confirmation is for supplier-specific or hybrid data." }, { status: 400 });
    }
    const email = (item.values.supplierEmail || "").trim();
    if (!isValidSupplierEmail(email)) {
      return NextResponse.json({ error: "Enter a valid supplier email first." }, { status: 400 });
    }
    const snapshot = snapshotForItem(item);
    const token = createSurveyToken();
    const verification = await createSupplierVerification({
      companyId: company.id as string | number,
      tokenHash: token.tokenHash,
      tokenSuffix: token.tokenSuffix,
      clientItemId: item.id,
      categoryId,
      method,
      supplierEmail: email.toLowerCase(),
      supplierName: item.values.supplier || item.values.treatmentProvider || "",
      itemLabel: snapshot.label,
      sentHash: snapshot.sentHash,
      snapshot: snapshot.values,
      createdBy: auth.user.id,
    });
    if (!verification?.id) return NextResponse.json({ error: "Could not create the confirmation." }, { status: 500 });
    await supersedePendingVerifications(company.id as string | number, item.id, verification.id);
    const mailed = await sendSupplierVerificationEmail({
      to: email,
      companyName: typeof company.name === "string" ? company.name : inventory?.companyName || "",
      itemLabel: snapshot.label,
      categoryName: categoryName(categoryId),
      year: inventory?.year ? formatReportingYear(inventory.year) : "",
      token: token.token,
    });
    return NextResponse.json({
      verification: {
        id: verification.id,
        clientItemId: verification.clientItemId,
        categoryId: verification.categoryId,
        status: verification.status,
        supplierEmail: verification.supplierEmail,
        tokenSuffix: verification.tokenSuffix,
        verifiedAt: verification.verifiedAt,
        edited: verification.edited,
      },
      token: token.token,
      path: `/v/${token.token}`,
      emailed: mailed.sent,
      mailError: mailed.sent ? "" : mailed.reason,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not send the confirmation.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
