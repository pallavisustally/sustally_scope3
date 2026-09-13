import { NextResponse } from "next/server";
import { readAuth } from "@/lib/require-user";

export async function GET() {
  const auth = await readAuth();
  if (auth.status !== "ok") return NextResponse.json({ user: null }, { status: 401 });
  return NextResponse.json({ user: auth.user });
}
