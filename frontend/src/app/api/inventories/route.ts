import { NextResponse } from "next/server";
import { listInventories } from "@/lib/payload-client";
import { requireUser } from "@/lib/require-user";

export async function GET() {
  const auth = await requireUser();
  if (!auth.user) return auth.response;
  try {
    const inventories = await listInventories();
    return NextResponse.json(inventories);
  } catch {
    return NextResponse.json([]);
  }
}
