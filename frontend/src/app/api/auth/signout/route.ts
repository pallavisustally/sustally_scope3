import { NextResponse } from "next/server";
import { clearSessionCookie } from "@/lib/auth-session";

export async function POST() {
  return clearSessionCookie(NextResponse.json({ ok: true }));
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const dest = new URL("/", url.origin);
  return clearSessionCookie(NextResponse.redirect(dest));
}
