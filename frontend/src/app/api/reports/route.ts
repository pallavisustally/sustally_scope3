import { NextResponse } from "next/server";
import { saveReport } from "@/lib/payload-client";
import { requireUser } from "@/lib/require-user";

export async function POST(request: Request) {
  const auth = await requireUser();
  if (!auth.user) return auth.response;
  const body = (await request.json()) as {
    sessionKey?: string;
    format?: "pdf" | "xlsx";
    includes?: string[];
    totalTco2e?: number;
    year?: number | null;
  };
  if (!body.sessionKey) return NextResponse.json({ error: "Missing session" }, { status: 400 });
  if (body.format !== "pdf" && body.format !== "xlsx") {
    return NextResponse.json({ error: "Format must be pdf or xlsx" }, { status: 400 });
  }
  try {
    const result = await saveReport(body.sessionKey, {
      format: body.format,
      includes: Array.isArray(body.includes) ? body.includes : [],
      totalTco2e: Number(body.totalTco2e) || 0,
      year: body.year ?? null,
    }, auth.user.id);
    return NextResponse.json({ ok: true, companyId: result.companyId });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not save report";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
