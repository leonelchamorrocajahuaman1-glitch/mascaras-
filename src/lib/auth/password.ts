import "server-only";
import { scrypt, timingSafeEqual } from "node:crypto";

/** Formato: scrypt$<N>$<r>$<p>$<salt base64>$<hash base64> (generado con `npm run admin:hash`). */
export async function verifyPassword(password: string, stored: string | undefined): Promise<boolean> {
  if (!stored) return false;
  const parts = stored.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;
  const [, n, r, p, saltB64, hashB64] = parts;
  const salt = Buffer.from(saltB64, "base64");
  const expected = Buffer.from(hashB64, "base64");
  const derived = await new Promise<Buffer>((resolve, reject) =>
    scrypt(password, salt, expected.length, { N: Number(n), r: Number(r), p: Number(p), maxmem: 256 * 1024 * 1024 }, (err, key) =>
      err ? reject(err) : resolve(key),
    ),
  );
  return derived.length === expected.length && timingSafeEqual(derived, expected);
}
