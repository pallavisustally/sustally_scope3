import { NextResponse } from "next/server";
import { listInventories } from "@/lib/payload-client";
import { requireUser } from "@/lib/require-user";

export async function GET(request: Request) {
  const auth = await requireUser();
  if (!auth.user) return auth.response;
  const currentSessionKey = new URL(request.url).searchParams.get("current") || undefined;
  try {
    const inventories = await listInventories(auth.user.id, currentSessionKey);
    return NextResponse.json(inventories);
  } catch {
    return NextResponse.json([]);
  }
}
