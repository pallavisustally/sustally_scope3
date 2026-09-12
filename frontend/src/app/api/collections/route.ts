import { NextResponse } from "next/server";
import { saveInventory, snapshotFromBody } from "@/lib/payload-client";
import type { CollectionDoc } from "@/lib/collections-map";
import { requireUser } from "@/lib/require-user";

export async function PUT(request: Request) {
  const auth = await requireUser();
  if (!auth.user) return auth.response;
  const body = (await request.json()) as Record<string, CollectionDoc[]>;
  const next = snapshotFromBody(body);
  const result = await saveInventory(next);
  return NextResponse.json({ ok: true, ...result });
}
