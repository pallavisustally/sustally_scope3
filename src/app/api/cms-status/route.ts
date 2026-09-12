import { NextResponse } from "next/server";
import { pingCms } from "@/lib/payload-client";
import { requireUser } from "@/lib/require-user";

export async function GET() {
  const auth = await requireUser();
  if (!auth.user) return auth.response;
  const status = await pingCms();
  return NextResponse.json(status);
}
