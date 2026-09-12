import { NextResponse } from "next/server";
import { createSessionToken, sessionCookieOptions, SESSION_COOKIE } from "@/lib/auth-session";
import { resetPassword } from "@/lib/auth-store";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { token?: string; password?: string };
  if (!body.token) return NextResponse.json({ error: "This reset link is missing a token." }, { status: 400 });
  const result = await resetPassword(body.token, body.password || "");
  if (!("user" in result)) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  const token = await createSessionToken(result.user.id);
  const response = NextResponse.json({ user: result.user });
  response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
  return response;
}
