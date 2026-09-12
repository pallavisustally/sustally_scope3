import { NextResponse } from "next/server";
import { loadInventory } from "@/lib/payload-client";
import { requireUser } from "@/lib/require-user";

type Ctx = { params: Promise<{ sessionKey: string }> };

export async function GET(_request: Request, { params }: Ctx) {
  const auth = await requireUser();
  if (!auth.user) return auth.response;
  const { sessionKey } = await params;
  if (!sessionKey) return NextResponse.json({ error: "Missing session" }, { status: 400 });
  try {
    const inventory = await loadInventory(sessionKey, auth.user.id);
    if (!inventory) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(inventory);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Payload unavailable";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
