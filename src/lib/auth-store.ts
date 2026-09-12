import { createHash, randomBytes, scrypt as scryptCb, timingSafeEqual } from "crypto";
import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { promisify } from "util";

const scrypt = promisify(scryptCb);
const STORE = path.join(process.cwd(), "data", "users.json");

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

async function readUsers(): Promise<StoredUser[]> {
  try {
    const raw = await readFile(STORE, "utf8");
    const parsed = JSON.parse(raw) as StoredUser[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeUsers(users: StoredUser[]) {
  await mkdir(path.dirname(STORE), { recursive: true });
  await writeFile(STORE, JSON.stringify(users, null, 2), "utf8");
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

  const users = await readUsers();
  if (users.some((user) => user.email === email)) return { error: "An account already uses that email." };
  if (users.some((user) => user.phone === phone)) return { error: "An account already uses that phone number." };

  const salt = randomBytes(16).toString("hex");
  const user: StoredUser = {
    id: randomBytes(12).toString("hex"),
    firstName,
    lastName,
    email,
    phone,
    passwordSalt: salt,
    passwordHash: await hashPassword(password, salt),
    createdAt: new Date().toISOString(),
  };
  users.push(user);
  await writeUsers(users);
  return { user: publicUser(user) };
}

export async function authenticate(identifier: string, password: string): Promise<AuthResult> {
  const email = normalizeEmail(identifier);
  const phone = normalizePhone(identifier);
  const users = await readUsers();
  const user = users.find((row) => row.email === email || phoneMatches(row.phone, phone));
  if (!user) return { error: "Email or phone and password do not match." };
  const hash = await hashPassword(password, user.passwordSalt);
  const left = Buffer.from(hash, "hex");
  const right = Buffer.from(user.passwordHash, "hex");
  if (left.length !== right.length || !timingSafeEqual(left, right)) {
    return { error: "Email or phone and password do not match." };
  }
  return { user: publicUser(user) };
}

export async function findUserById(id: string) {
  const users = await readUsers();
  const user = users.find((row) => row.id === id);
  return user ? publicUser(user) : null;
}

export async function findUserForReset(identifier: string) {
  const email = normalizeEmail(identifier);
  const phone = normalizePhone(identifier);
  const users = await readUsers();
  return users.find((row) => row.email === email || phoneMatches(row.phone, phone)) ?? null;
}

export async function setResetToken(userId: string) {
  const token = randomBytes(32).toString("hex");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const users = await readUsers();
  const index = users.findIndex((row) => row.id === userId);
  if (index < 0) return null;
  users[index] = {
    ...users[index],
    resetTokenHash: tokenHash,
    resetExpires: Date.now() + 60 * 60 * 1000,
  };
  await writeUsers(users);
  return token;
}

export async function resetPassword(token: string, password: string): Promise<AuthResult> {
  if (password.length < 8) return { error: "Password must be at least 8 characters." };
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const users = await readUsers();
  const index = users.findIndex(
    (row) => row.resetTokenHash === tokenHash && typeof row.resetExpires === "number" && row.resetExpires > Date.now(),
  );
  if (index < 0) return { error: "This reset link is invalid or has expired." };
  const salt = randomBytes(16).toString("hex");
  users[index] = {
    ...users[index],
    passwordSalt: salt,
    passwordHash: await hashPassword(password, salt),
    resetTokenHash: undefined,
    resetExpires: undefined,
  };
  await writeUsers(users);
  return { user: publicUser(users[index]) };
}
