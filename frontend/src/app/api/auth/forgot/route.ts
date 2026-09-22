import { NextResponse } from "next/server";
import { findUserForReset, setResetToken } from "@/lib/auth-store";
import { mailConfigured, sendPasswordResetEmail } from "@/lib/mail";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { identifier?: string };
  const identifier = body.identifier?.trim() || "";
  if (!identifier) {
    return NextResponse.json({ error: "Enter the email or phone on the account." }, { status: 400 });
  }

  if (!mailConfigured()) {
    return NextResponse.json(
      {
        error:
          "Password reset email is not configured on this server. Set SMTP_USER and SMTP_PASS on the frontend, then redeploy.",
      },
      { status: 503 },
    );
  }

  let user;
  try {
    user = await findUserForReset(identifier);
  } catch (error) {
    console.error("findUserForReset failed", error);
    return NextResponse.json({ error: "Could not start the reset. Try again in a moment." }, { status: 502 });
  }

  if (user) {
    const token = await setResetToken(user.id);
    if (!token) {
      return NextResponse.json({ error: "Could not start the reset. Try again in a moment." }, { status: 502 });
    }
    try {
      await sendPasswordResetEmail(user.email, user.firstName, token);
    } catch (error) {
      console.error("Password reset email failed", error);
      return NextResponse.json({ error: "Could not send the reset email. Try again in a moment." }, { status: 502 });
    }
  }

  return NextResponse.json({
    ok: true,
    message: "If an account matches, a reset link is on the way to the email on file.",
  });
}
