import nodemailer from "nodemailer";

function appUrl() {
  return process.env.APP_URL || "http://127.0.0.1:3000";
}

function smtpPass() {
  return (process.env.SMTP_PASS || "").replace(/\s+/g, "");
}

export async function sendPasswordResetEmail(to: string, firstName: string, token: string) {
  const user = process.env.SMTP_USER;
  const pass = smtpPass();
  if (!user || !pass) throw new Error("SMTP is not configured.");

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: Number(process.env.SMTP_PORT || 587),
    secure: Number(process.env.SMTP_PORT || 587) === 465,
    auth: { user, pass },
  });

  const link = `${appUrl()}/reset-password?token=${encodeURIComponent(token)}`;
  const from = process.env.SMTP_FROM || user;
  await transporter.sendMail({
    from: `Sustally <${from}>`,
    to,
    subject: "Reset your Sustally password",
    text: `Hi ${firstName},\n\nUse this link to choose a new password. It expires in one hour.\n\n${link}\n\nIf you did not ask for this, you can ignore the email.\n`,
    html: `<p>Hi ${firstName},</p><p>Use this link to choose a new password. It expires in one hour.</p><p><a href="${link}">Reset password</a></p><p>If you did not ask for this, you can ignore the email.</p>`,
  });
}
