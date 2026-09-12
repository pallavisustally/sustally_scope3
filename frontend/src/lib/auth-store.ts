import { createHash, randomBytes, scrypt as scryptCb, timingSafeEqual } from "crypto";
import { promisify } from "util";

const scrypt = promisify(scryptCb);
const PAYLOAD_URL = (process.env.PAYLOAD_URL || "http://127.0.0.1:3001").replace(/\/$/, "");
const PAYLOAD_SECRET = process.env.PAYLOAD_SECRET || "sustally-scope3-dev-secret-change-me";

export type StoredUser = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  passwordHash: string;
  passwordSalt: string;
  createdAt: string;
  resetTokenHash?: string;
  resetExpires?: number;
};

export type PublicUser = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
};

export type AuthResult = { user: PublicUser } | { error: string };

function publicUser(user: StoredUser): PublicUser {
  return {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    phone: user.phone,
  };
}

export function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export function normalizePhone(value: string) {
  return value.replace(/\D/g, "");
}

export function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(value));
}

export function isPhone(value: string) {
  const digits = normalizePhone(value);
  return digits.length >= 8 && digits.length <= 15;
}

function phoneMatches(stored: string, input: string) {
  if (!input || input.length < 8) return false;
  return stored === input || stored.endsWith(input) || input.endsWith(stored);
}

function cmsMisconfigured() {
  const live = Boolean(process.env.VERCEL);
  return live && (!process.env.PAYLOAD_URL || PAYLOAD_URL.includes("127.0.0.1") || PAYLOAD_URL.includes("localhost"));
}

function cmsUnavailableError() {
  return "Could not reach the CMS. Set PAYLOAD_URL and PAYLOAD_SECRET on the frontend, then redeploy.";
}

async function payloadRequest(path: string, init?: RequestInit) {
  if (cmsMisconfigured()) {
    throw new Error(cmsUnavailableError());
  }
  const response = await fetch(`${PAYLOAD_URL}/api${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "x-payload-secret": PAYLOAD_SECRET,
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });
  const text = await response.text();
  let json: Record<string, unknown> = {};
  try {
    json = text ? (JSON.parse(text) as Record<string, unknown>) : {};
  } catch {
    json = { raw: text };
  }
  if (!response.ok) {
    throw new Error(`Payload ${response.status} ${path}: ${text.slice(0, 240)}`);
  }
  return json;
}

function fromDoc(doc: Record<string, unknown> | undefined | null): StoredUser | null {
  if (!doc?.id) return null;
  return {
    id: String(doc.id),
    firstName: typeof doc.firstName === "string" ? doc.firstName : "",
    lastName: typeof doc.lastName === "string" ? doc.lastName : "",
    email: typeof doc.email === "string" ? doc.email : "",
    phone: typeof doc.phone === "string" ? doc.phone : "",
    passwordHash: typeof doc.passwordHash === "string" ? doc.passwordHash : "",
    passwordSalt: typeof doc.passwordSalt === "string" ? doc.passwordSalt : "",
    createdAt: typeof doc.createdAt === "string" ? doc.createdAt : new Date().toISOString(),
    resetTokenHash: typeof doc.resetTokenHash === "string" ? doc.resetTokenHash : undefined,
    resetExpires: typeof doc.resetExpires === "number" ? doc.resetExpires : undefined,
  };
}

async function findByField(field: string, value: string) {
  const query = new URLSearchParams({
    [`where[${field}][equals]`]: value,
    limit: "1",
    depth: "0",
  });
  const result = (await payloadRequest(`/app-users?${query.toString()}`)) as { docs?: Array<Record<string, unknown>> };
  return fromDoc(result.docs?.[0]);
}

async function listAppUsers() {
  const result = (await payloadRequest("/app-users?limit=1000&depth=0")) as { docs?: Array<Record<string, unknown>> };
  return (result.docs ?? []).map((doc) => fromDoc(doc)).filter((row): row is StoredUser => Boolean(row));
}

async function hashPassword(password: string, salt: string) {
  const derived = (await scrypt(password, salt, 64)) as Buffer;
  return derived.toString("hex");
}

export async function createUser(input: {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
}): Promise<AuthResult> {
  const firstName = input.firstName.trim();
  const lastName = input.lastName.trim();
  const email = normalizeEmail(input.email);
  const phone = normalizePhone(input.phone);
  const password = input.password;

  if (!firstName || !lastName) return { error: "Enter first and last name." };
  if (!isEmail(email)) return { error: "Enter a valid email address." };
  if (!isPhone(phone)) return { error: "Enter a valid phone number." };
  if (password.length < 8) return { error: "Password must be at least 8 characters." };

  try {
    if (await findByField("email", email)) return { error: "An account already uses that email." };
    if (await findByField("phone", phone)) return { error: "An account already uses that phone number." };

    const salt = randomBytes(16).toString("hex");
    const created = (await payloadRequest("/app-users", {
      method: "POST",
      body: JSON.stringify({
        firstName,
        lastName,
        email,
        phone,
        passwordSalt: salt,
        passwordHash: await hashPassword(password, salt),
      }),
    })) as { doc?: Record<string, unknown> };
    const user = fromDoc(created.doc);
    if (!user) return { error: "Could not create the account." };
    return { user: publicUser(user) };
  } catch (error) {
    console.error("createUser failed", error);
    return { error: cmsMisconfigured() ? cmsUnavailableError() : "Could not create the account. Try again in a moment." };
  }
}

export async function authenticate(identifier: string, password: string): Promise<AuthResult> {
  const email = normalizeEmail(identifier);
  const phone = normalizePhone(identifier);
  try {
    const user =
      (isEmail(email) ? await findByField("email", email) : null) ??
      (phone ? await findByField("phone", phone) : null) ??
      (await listAppUsers()).find((row) => row.email === email || phoneMatches(row.phone, phone));
    if (!user) return { error: "Email or phone and password do not match." };
    const hash = await hashPassword(password, user.passwordSalt);
    const left = Buffer.from(hash, "hex");
    const right = Buffer.from(user.passwordHash, "hex");
    if (left.length !== right.length || !timingSafeEqual(left, right)) {
      return { error: "Email or phone and password do not match." };
    }
    return { user: publicUser(user) };
  } catch (error) {
    console.error("authenticate failed", error);
    return { error: cmsMisconfigured() ? cmsUnavailableError() : "Could not sign in. Try again in a moment." };
  }
}

export async function findUserById(id: string) {
  try {
    const result = (await payloadRequest(`/app-users/${id}?depth=0`)) as Record<string, unknown>;
    const user = fromDoc((result.doc as Record<string, unknown> | undefined) ?? result);
    return user ? publicUser(user) : null;
  } catch {
    return null;
  }
}

export async function findUserForReset(identifier: string) {
  const email = normalizeEmail(identifier);
  const phone = normalizePhone(identifier);
  try {
    return (
      (isEmail(email) ? await findByField("email", email) : null) ??
      (phone ? await findByField("phone", phone) : null) ??
      (await listAppUsers()).find((row) => row.email === email || phoneMatches(row.phone, phone)) ??
      null
    );
  } catch (error) {
    console.error("findUserForReset failed", error);
    return null;
  }
}

export async function setResetToken(userId: string) {
  const token = randomBytes(32).toString("hex");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  try {
    await payloadRequest(`/app-users/${userId}`, {
      method: "PATCH",
      body: JSON.stringify({
        resetTokenHash: tokenHash,
        resetExpires: Date.now() + 60 * 60 * 1000,
      }),
    });
    return token;
  } catch (error) {
    console.error("setResetToken failed", error);
    return null;
  }
}

export async function resetPassword(token: string, password: string): Promise<AuthResult> {
  if (password.length < 8) return { error: "Password must be at least 8 characters." };
  const tokenHash = createHash("sha256").update(token).digest("hex");
  try {
    const query = new URLSearchParams({
      "where[resetTokenHash][equals]": tokenHash,
      limit: "20",
      depth: "0",
    });
    const result = (await payloadRequest(`/app-users?${query.toString()}`)) as { docs?: Array<Record<string, unknown>> };
    const user = (result.docs ?? [])
      .map((doc) => fromDoc(doc))
      .find((row) => row && typeof row.resetExpires === "number" && row.resetExpires > Date.now());
    if (!user) return { error: "This reset link is invalid or has expired." };
    const salt = randomBytes(16).toString("hex");
    const saved = (await payloadRequest(`/app-users/${user.id}`, {
      method: "PATCH",
      body: JSON.stringify({
        passwordSalt: salt,
        passwordHash: await hashPassword(password, salt),
        resetTokenHash: null,
        resetExpires: null,
      }),
    })) as { doc?: Record<string, unknown> };
    const next = fromDoc(saved.doc) ?? { ...user, passwordSalt: salt };
    return { user: publicUser(next) };
  } catch (error) {
    console.error("resetPassword failed", error);
    return { error: "Could not reset the password. Try again in a moment." };
  }
}
