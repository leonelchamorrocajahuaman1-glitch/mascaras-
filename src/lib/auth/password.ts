import "server-only";
import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";

const N = 16384;
const R = 8;
const P = 1;

function derive(password: string, salt: Buffer, len: number, n = N, r = R, p = P) {
  return new Promise<Buffer>((resolve, reject) =>
    scrypt(password, salt, len, { N: n, r, p, maxmem: 256 * 1024 * 1024 }, (err, key) => (err ? reject(err) : resolve(key))),
  );
}

/** Formato: scrypt:<N>:<r>:<p>:<salt base64>:<hash base64> (igual que `npm run admin:hash`). */
export async function hashPassword(password: string) {
  const salt = randomBytes(16);
  const hash = await derive(password, salt, 64);
  return `scrypt:${N}:${R}:${P}:${salt.toString("base64")}:${hash.toString("base64")}`;
}

export async function verifyPassword(password: string, stored: string | undefined): Promise<boolean> {
  if (!stored) return false;
  const parts = stored.trim().split(":");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;
  const [, n, r, p, saltB64, hashB64] = parts;
  const expected = Buffer.from(hashB64, "base64");
  const derived = await derive(password, Buffer.from(saltB64, "base64"), expected.length, Number(n), Number(r), Number(p));
  return derived.length === expected.length && timingSafeEqual(derived, expected);
}

/** Hash ficticio para igualar el tiempo de respuesta cuando el usuario no existe. */
export const DUMMY_HASH = "scrypt:16384:8:1:AAAAAAAAAAAAAAAAAAAAAA==:" + Buffer.alloc(64).toString("base64");
