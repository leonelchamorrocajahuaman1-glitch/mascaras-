import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "sm_admin_session";
export const SESSION_TTL_SECONDS = 60 * 60 * 8;

function secretKey() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("SESSION_SECRET no está configurado (mínimo 32 caracteres). Ejecuta `npm run setup`.");
  }
  return new TextEncoder().encode(secret);
}

export interface AdminSession {
  sub: string;
  role: "admin";
}

export async function createSessionToken(email: string) {
  return new SignJWT({ role: "admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(email)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .setIssuer("spider-masks")
    .setAudience("spider-masks-admin")
    .sign(secretKey());
}

export async function verifySessionToken(token: string | undefined): Promise<AdminSession | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey(), {
      issuer: "spider-masks",
      audience: "spider-masks-admin",
      algorithms: ["HS256"],
    });
    if (payload.role !== "admin" || typeof payload.sub !== "string") return null;
    if (payload.sub.toLowerCase() !== (process.env.ADMIN_EMAIL ?? "").toLowerCase()) return null;
    return { sub: payload.sub, role: "admin" };
  } catch {
    return null;
  }
}
