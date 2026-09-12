import { NextResponse } from "next/server";
import { isCollectionSlug, listCollection } from "@/lib/payload-client";
import { requireUser } from "@/lib/require-user";

type Ctx = { params: Promise<{ slug: string }> };

export async function GET(_request: Request, { params }: Ctx) {
  const auth = await requireUser();
  if (!auth.user) return auth.response;
  const { slug } = await params;
  if (!isCollectionSlug(slug)) return NextResponse.json({ error: "Unknown collection" }, { status: 404 });
  try {
    const docs = await listCollection(slug);
    return NextResponse.json(docs);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Payload unavailable";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
