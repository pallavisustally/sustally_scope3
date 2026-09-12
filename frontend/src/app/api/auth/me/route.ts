import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { readSessionToken, SESSION_COOKIE } from "@/lib/auth-session";
import { findUserById } from "@/lib/auth-store";

export async function GET() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const session = await readSessionToken(token);
  if (!session) return NextResponse.json({ user: null }, { status: 401 });
  const user = await findUserById(session.userId);
  if (!user) return NextResponse.json({ user: null }, { status: 401 });
  return NextResponse.json({ user });
}
