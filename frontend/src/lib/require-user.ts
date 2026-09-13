import { cache } from "react";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { readSessionToken, SESSION_COOKIE } from "@/lib/auth-session";
import { findUserById, type PublicUser } from "@/lib/auth-store";

export type AuthState =
  | { status: "anon" }
  | { status: "invalid" }
  | { status: "unavailable" }
  | { status: "ok"; user: PublicUser };

export const readAuth = cache(async (): Promise<AuthState> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const session = await readSessionToken(token);
  if (!session) return { status: "anon" };
  try {
    const user = await findUserById(session.userId);
    if (!user) return { status: "invalid" };
    return { status: "ok", user };
  } catch {
    return { status: "unavailable" };
  }
});

export async function requireUser(): Promise<{ user: PublicUser } | { user: null; response: NextResponse }> {
  const auth = await readAuth();
  if (auth.status === "ok") return { user: auth.user };
  const status = auth.status === "unavailable" ? 503 : 401;
  return { user: null, response: NextResponse.json({ error: "Sign in required." }, { status }) };
}
