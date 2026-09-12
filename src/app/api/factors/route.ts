import { NextResponse } from "next/server";
import { EMISSION_FACTORS } from "@/data/protocol";
import { listEmissionFactors } from "@/lib/payload-client";
import { requireUser } from "@/lib/require-user";

export async function GET() {
  const auth = await requireUser();
  if (!auth.user) return auth.response;
  try {
    const factors = await listEmissionFactors();
    return NextResponse.json(factors);
  } catch {
    return NextResponse.json(EMISSION_FACTORS);
  }
}
