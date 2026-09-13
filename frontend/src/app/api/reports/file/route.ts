import { NextResponse } from "next/server";
import type { InventoryResult } from "@/lib/calculate";
import type { InventoryState } from "@/lib/inventory-types";
import { buildInventoryReport, type ReportFormat, type ReportOptions } from "@/lib/report-export";
import { requireUser } from "@/lib/require-user";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const auth = await requireUser();
  if (!auth.user) return auth.response;
  try {
    const body = (await request.json()) as {
      state?: InventoryState;
      results?: InventoryResult;
      format?: ReportFormat;
      includes?: string[];
      options?: ReportOptions;
    };
    if (!body.state || !body.results || (body.format !== "pdf" && body.format !== "xlsx")) {
      return NextResponse.json({ error: "Missing inventory, results, or format." }, { status: 400 });
    }
    const file = await buildInventoryReport(body.state, body.results, body.format, body.includes ?? [], body.options ?? {});
    const copy = Buffer.from(file.bytes);
    return new NextResponse(copy, {
      headers: {
        "Content-Type": file.mime,
        "Content-Disposition": `attachment; filename="${file.filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not generate the report file.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
