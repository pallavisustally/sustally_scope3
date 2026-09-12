import { NextResponse } from "next/server";
import { isCollectionSlug } from "@/lib/payload-client";
import { requireUser } from "@/lib/require-user";

const PAYLOAD_URL = process.env.PAYLOAD_URL || "http://127.0.0.1:3001";
const PAYLOAD_SECRET = process.env.PAYLOAD_SECRET || "sustally-scope3-dev-secret-change-me";

type Ctx = { params: Promise<{ slug: string; id: string }> };

async function proxy(slug: string, id: string, init?: RequestInit) {
  const response = await fetch(`${PAYLOAD_URL}/api/${slug}/${id}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "x-payload-secret": PAYLOAD_SECRET,
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });
  const text = await response.text();
  try {
    return NextResponse.json(JSON.parse(text), { status: response.status });
  } catch {
    return NextResponse.json({ error: text.slice(0, 240) }, { status: response.status });
  }
}

export async function GET(_request: Request, { params }: Ctx) {
  const auth = await requireUser();
  if (!auth.user) return auth.response;
  const { slug, id } = await params;
  if (!isCollectionSlug(slug)) return NextResponse.json({ error: "Unknown collection" }, { status: 404 });
  return proxy(slug, id);
}

export async function PATCH(request: Request, { params }: Ctx) {
  const auth = await requireUser();
  if (!auth.user) return auth.response;
  const { slug, id } = await params;
  if (!isCollectionSlug(slug)) return NextResponse.json({ error: "Unknown collection" }, { status: 404 });
  return proxy(slug, id, { method: "PATCH", body: await request.text() });
}

export async function DELETE(_request: Request, { params }: Ctx) {
  const auth = await requireUser();
  if (!auth.user) return auth.response;
  const { slug, id } = await params;
  if (!isCollectionSlug(slug)) return NextResponse.json({ error: "Unknown collection" }, { status: 404 });
  return proxy(slug, id, { method: "DELETE" });
}
