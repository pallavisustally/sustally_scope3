import { createHash, randomBytes, scrypt as scryptCb, timingSafeEqual } from "crypto";
import { promisify } from "util";

const scrypt = promisify(scryptCb);
const PAYLOAD_URL = (process.env.PAYLOAD_URL || "http://127.0.0.1:3001").replace(/\/$/, "");
const PAYLOAD_SECRET = process.env.PAYLOAD_SECRET || "sustally-scope3-dev-secret-change-me";
const CMS_TIMEOUT_MS = 15_000;

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

export type AuthResult = { user: PublicUser } | { error: string; unavailable?: boolean };

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
  return Boolean(stored) && Boolean(input) && stored === input;
}

function cmsMisconfigured() {
  const live = Boolean(process.env.VERCEL);
  return live && (!process.env.PAYLOAD_URL || PAYLOAD_URL.includes("127.0.0.1") || PAYLOAD_URL.includes("localhost"));
}

function cmsUnavailableError() {
  if (cmsMisconfigured()) {
    return "Could not reach the CMS. Set PAYLOAD_URL and PAYLOAD_SECRET on the frontend, then redeploy.";
  }
  return `Could not reach the CMS at ${PAYLOAD_URL}. Start the backend on port 3001, then try again.`;
}

function errorText(error: unknown) {
  if (error instanceof Error) return `${error.name} ${error.message}`;
  return String(error);
}

function isTransientCmsError(error: unknown) {
  return /fetch failed|ECONNREFUSED|ENOTFOUND|ETIMEDOUT|ECONNRESET|AbortError|TimeoutError|timed out|aborted|Payload 5\d\d|UND_ERR/i.test(
    errorText(error),
  );
}

function fromCmsCatch(error: unknown, fallback: string): AuthResult {
  console.error(fallback, error);
  if (/Payload 403/.test(errorText(error))) {
    return {
      error: "The app is not allowed to use the CMS. Set the same PAYLOAD_SECRET on the frontend and backend, then restart both.",
      unavailable: true,
    };
  }
  if (cmsMisconfigured() || isTransientCmsError(error)) {
    return { error: cmsUnavailableError(), unavailable: true };
  }
  return { error: fallback, unavailable: true };
}

async function payloadRequest(path: string, init?: RequestInit) {
  if (cmsMisconfigured()) {
    throw new Error(cmsUnavailableError());
  }

  const run = async () => {
    const response = await fetch(`${PAYLOAD_URL}/api${path}`, {
      ...init,
      signal: init?.signal ?? AbortSignal.timeout(CMS_TIMEOUT_MS),
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
  };

  try {
    return await run();
  } catch (error) {
    const method = (init?.method || "GET").toUpperCase();
    if (method !== "GET" || !isTransientCmsError(error)) throw error;
    await new Promise((resolve) => setTimeout(resolve, 400));
    return await run();
  }
}

function docId(doc: Record<string, unknown> | undefined | null) {
  const raw = doc?.id ?? doc?._id;
  if (raw == null) return "";
  if (typeof raw === "object") return String(raw);
  return String(raw);
}

function fromDoc(doc: Record<string, unknown> | undefined | null): StoredUser | null {
  if (!doc) return null;
  const id = docId(doc);
  if (!id || id === "[object Object]") return null;
  return {
    id,
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

async function passwordMatches(user: StoredUser, password: string) {
  if (!user.passwordHash || !user.passwordSalt) return false;
  const hash = await hashPassword(password, user.passwordSalt);
  const left = Buffer.from(hash, "hex");
  const right = Buffer.from(user.passwordHash, "hex");
  return left.length === right.length && timingSafeEqual(left, right);
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
    const salt = randomBytes(16).toString("hex");
    const [emailUser, phoneUser, passwordHash] = await Promise.all([
      findByField("email", email),
      findByField("phone", phone),
      hashPassword(password, salt),
    ]);
    if (emailUser) return { error: "An account already uses that email." };
    if (phoneUser) return { error: "An account already uses that phone number." };

    const create = () =>
      payloadRequest("/app-users", {
        method: "POST",
        body: JSON.stringify({
          firstName,
          lastName,
          email,
          phone,
          passwordSalt: salt,
          passwordHash,
        }),
      }) as Promise<{ doc?: Record<string, unknown> }>;

    try {
      const created = await create();
      const user = fromDoc(created.doc);
      if (!user) return { error: "Could not create the account." };
      return { user: publicUser(user) };
    } catch (error) {
      const existing =
        (await findByField("email", email).catch(() => null)) ??
        (await findByField("phone", phone).catch(() => null));
      if (existing) {
        if (await passwordMatches(existing, password)) return { user: publicUser(existing) };
        return {
          error: existing.email === email ? "An account already uses that email." : "An account already uses that phone number.",
        };
      }
      if (!isTransientCmsError(error)) throw error;
      try {
        const created = await create();
        const user = fromDoc(created.doc);
        if (!user) return { error: "Could not create the account." };
        return { user: publicUser(user) };
      } catch (retryError) {
        const createdAnyway = await findByField("email", email).catch(() => null);
        if (createdAnyway && (await passwordMatches(createdAnyway, password))) {
          return { user: publicUser(createdAnyway) };
        }
        throw retryError;
      }
    }
  } catch (error) {
    return fromCmsCatch(error, "Could not create the account. Try again in a moment.");
  }
}

export async function authenticate(identifier: string, password: string): Promise<AuthResult> {
  const email = normalizeEmail(identifier);
  const phone = normalizePhone(identifier);
  try {
    const user = isEmail(email)
      ? await findByField("email", email)
      : phone
        ? ((await findByField("phone", phone)) ?? (await listAppUsers()).find((row) => phoneMatches(row.phone, phone)) ?? null)
        : null;
    if (!user) return { error: "Email or phone and password do not match." };
    if (!(await passwordMatches(user, password))) {
      return { error: "Email or phone and password do not match." };
    }
    return { user: publicUser(user) };
  } catch (error) {
    return fromCmsCatch(error, "Could not sign in. Try again in a moment.");
  }
}

export async function findUserById(id: string) {
  if (!id) return null;
  const user = await findByField("id", id);
  return user ? publicUser(user) : null;
}

export async function findUserForReset(identifier: string) {
  const email = normalizeEmail(identifier);
  const phone = normalizePhone(identifier);
  return (
    (isEmail(email) ? await findByField("email", email) : null) ??
    (phone ? await findByField("phone", phone) : null) ??
    (await listAppUsers()).find((row) => row.email === email || phoneMatches(row.phone, phone)) ??
    null
  );
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
