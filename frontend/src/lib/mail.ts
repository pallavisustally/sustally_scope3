import nodemailer from "nodemailer";

function appUrl() {
  return process.env.APP_URL || "http://127.0.0.1:3000";
}

function smtpPass() {
  return (process.env.SMTP_PASS || "").replace(/\s+/g, "");
}

export function mailConfigured() {
  return Boolean(process.env.SMTP_USER && smtpPass());
}

function transporter() {
  const user = process.env.SMTP_USER;
  const pass = smtpPass();
  if (!user || !pass) throw new Error("SMTP is not configured.");
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: Number(process.env.SMTP_PORT || 587),
    secure: Number(process.env.SMTP_PORT || 587) === 465,
    auth: { user, pass },
  });
}

function fromAddress() {
  return process.env.SMTP_FROM || process.env.SMTP_USER || "";
}

export async function sendPasswordResetEmail(to: string, firstName: string, token: string) {
  const link = `${appUrl()}/reset-password?token=${encodeURIComponent(token)}`;
  await transporter().sendMail({
    from: `Sustally <${fromAddress()}>`,
    to,
    subject: "Reset your Sustally password",
    text: `Hi ${firstName},\n\nUse this link to choose a new password. It expires in one hour.\n\n${link}\n\nIf you did not ask for this, you can ignore the email.\n`,
    html: `<p>Hi ${firstName},</p><p>Use this link to choose a new password. It expires in one hour.</p><p><a href="${link}">Reset password</a></p><p>If you did not ask for this, you can ignore the email.</p>`,
  });
}

export async function sendSupplierVerificationEmail(input: {
  to: string;
  companyName: string;
  itemLabel: string;
  categoryName: string;
  year: string;
  token: string;
}) {
  if (!mailConfigured()) return { sent: false as const, reason: "Email sending is not configured." };
  const link = `${appUrl()}/v/${encodeURIComponent(input.token)}`;
  const company = input.companyName.trim() || "A company";
  const year = input.year ? ` for ${input.year}` : "";
  try {
    await transporter().sendMail({
      from: `Sustally <${fromAddress()}>`,
      to: input.to,
      subject: `${company} asks you to confirm scope 3 activity data`,
      text: `${company} entered activity data for ${input.itemLabel} (${input.categoryName}${year}) and asks you to confirm it.\n\nOpen this link to accept the figures or edit them, then confirm:\n${link}\n\nNo Sustally account is required.\n`,
      html: `<p>${company} entered activity data for <strong>${input.itemLabel}</strong> (${input.categoryName}${year}) and asks you to confirm it.</p><p><a href="${link}">Review, accept, or edit this data</a></p><p>No Sustally account is required.</p>`,
    });
    return { sent: true as const };
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Could not send the email.";
    return { sent: false as const, reason };
  }
}
