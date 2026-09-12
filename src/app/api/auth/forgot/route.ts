import { NextResponse } from "next/server";
import { findUserForReset, setResetToken } from "@/lib/auth-store";
import { sendPasswordResetEmail } from "@/lib/mail";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { identifier?: string };
  const identifier = body.identifier?.trim() || "";
  if (!identifier) {
    return NextResponse.json({ error: "Enter the email or phone on the account." }, { status: 400 });
  }

  const user = await findUserForReset(identifier);
  if (user) {
    const token = await setResetToken(user.id);
    if (token) {
      try {
        await sendPasswordResetEmail(user.email, user.firstName, token);
      } catch (error) {
        console.error("Password reset email failed", error);
        return NextResponse.json({ error: "Could not send the reset email. Try again in a moment." }, { status: 502 });
      }
    }
  }

  return NextResponse.json({
    ok: true,
    message: "If an account matches, a reset link is on the way to the email on file.",
  });
}
