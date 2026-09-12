import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { readSessionToken, SESSION_COOKIE } from "@/lib/auth-session";
import { findUserById, type PublicUser } from "@/lib/auth-store";

export async function requireUser(): Promise<{ user: PublicUser } | { user: null; response: NextResponse }> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const session = await readSessionToken(token);
  if (!session) {
    return { user: null, response: NextResponse.json({ error: "Sign in required." }, { status: 401 }) };
  }
  const user = await findUserById(session.userId);
  if (!user) {
    return { user: null, response: NextResponse.json({ error: "Sign in required." }, { status: 401 }) };
  }
  return { user };
}
