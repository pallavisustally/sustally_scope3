import { NextResponse } from "next/server";
import { createSessionToken, sessionCookieOptions, SESSION_COOKIE } from "@/lib/auth-session";
import { authenticate } from "@/lib/auth-store";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { identifier?: string; password?: string };
  if (!body.identifier?.trim() || !body.password) {
    return NextResponse.json({ error: "Enter email or phone and password." }, { status: 400 });
  }
  const result = await authenticate(body.identifier, body.password);
  if ("error" in result && result.error) {
    return NextResponse.json({ error: result.error }, { status: 401 });
  }
  const token = await createSessionToken(result.user.id);
  const response = NextResponse.json({ user: result.user });
  response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
  return response;
}
