import { SignJWT, jwtVerify } from "jose";
import type { AdminRole } from "../types";
import { sessionSecretMaterial } from "./config";

export const SESSION_COOKIE = "sm_admin_session";
export const SESSION_TTL_SECONDS = 60 * 60 * 8;

function secretKey() {
  const secret = sessionSecretMaterial();
  if (!secret) throw new Error("Panel sin configurar: define ADMIN_EMAIL y ADMIN_PASSWORD (o SESSION_SECRET).");
  return new TextEncoder().encode(secret);
}

/** Contenido firmado del token. El rol real se vuelve a leer de la base de datos en cada petición. */
export interface TokenClaims {
  /** "owner" para el propietario (.env.local) o el id del usuario del panel. */
  sub: string;
  email: string;
  role: AdminRole;
  /** Versión de sesión del usuario: si cambia (contraseña, rol, desactivación) el token deja de valer. */
  ver: number;
}

export async function createSessionToken(claims: TokenClaims) {
  return new SignJWT({ email: claims.email, role: claims.role, ver: claims.ver, typ: "admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(claims.sub)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .setIssuer("spider-masks")
    .setAudience("spider-masks-admin")
    .sign(secretKey());
}

/** Solo comprueba firma y caducidad (válido en el proxy). La autorización completa está en auth/server.ts. */
export async function verifySessionToken(token: string | undefined): Promise<TokenClaims | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey(), {
      issuer: "spider-masks",
      audience: "spider-masks-admin",
      algorithms: ["HS256"],
    });
    if (payload.typ !== "admin" || typeof payload.sub !== "string" || typeof payload.email !== "string") return null;
    if (!["owner", "admin", "staff"].includes(String(payload.role))) return null;
    return { sub: payload.sub, email: payload.email, role: payload.role as AdminRole, ver: Number(payload.ver ?? 0) };
  } catch {
    return null;
  }
}
