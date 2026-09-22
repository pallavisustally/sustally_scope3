import { promisify } from "util";
import { randomBytes, scrypt as scryptCb } from "crypto";

const scrypt = promisify(scryptCb);

/** Must match `frontend/src/lib/auth-store.ts`. */
export async function hashAppPassword(password: string, salt: string) {
  const derived = (await scrypt(password, salt, 64)) as Buffer;
  return derived.toString("hex");
}

export function newAppPasswordSalt() {
  return randomBytes(16).toString("hex");
}
