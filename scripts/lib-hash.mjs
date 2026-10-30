import { randomBytes, scryptSync } from "node:crypto";

const N = 16384, r = 8, p = 1;

export function hashPassword(password) {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, 64, { N, r, p });
  // Separador ":" (no "$") para que dotenv no intente expandir variables.
  return `scrypt:${N}:${r}:${p}:${salt.toString("base64")}:${hash.toString("base64")}`;
}
