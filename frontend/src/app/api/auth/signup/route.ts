import { NextResponse } from "next/server";
import { createSessionToken, sessionCookieOptions, SESSION_COOKIE } from "@/lib/auth-session";
import { createUser } from "@/lib/auth-store";

export const maxDuration = 30;

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      firstName?: string;
      lastName?: string;
      email?: string;
      phone?: string;
      password?: string;
    };
    const result = await createUser({
      firstName: body.firstName || "",
      lastName: body.lastName || "",
      email: body.email || "",
      phone: body.phone || "",
      password: body.password || "",
    });
    if (!("user" in result)) {
      return NextResponse.json({ error: result.error }, { status: result.unavailable ? 503 : 400 });
    }
    const token = await createSessionToken(result.user.id);
    const response = NextResponse.json({ user: result.user });
    response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
    return response;
  } catch (error) {
    console.error("signup failed", error);
    return NextResponse.json({ error: "Could not create the account. Try again in a moment." }, { status: 500 });
  }
}
