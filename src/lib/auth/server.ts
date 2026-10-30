import "server-only";
import { cookies, headers } from "next/headers";
import { NextResponse } from "next/server";
import { redirect } from "next/navigation";
import { db } from "../db";
import type { AdminRole } from "../types";
import { can, type Permission } from "./permissions";
import { SESSION_COOKIE, verifySessionToken } from "./session";

export interface AdminSession {
  /** "owner" o id del usuario del panel. */
  id: string;
  email: string;
  name: string;
  role: AdminRole;
}

/**
 * Sesión del panel validada contra la fuente de verdad:
 *  - propietario: el email debe coincidir con ADMIN_EMAIL;
 *  - usuarios: deben existir, estar activos y tener la misma versión de sesión. El rol se lee de la BD.
 */
export async function getAdminSession(): Promise<AdminSession | null> {
  const jar = await cookies();
  const claims = await verifySessionToken(jar.get(SESSION_COOKIE)?.value).catch(() => null);
  if (!claims) return null;
  const ownerEmail = (process.env.ADMIN_EMAIL ?? "").toLowerCase();
  if (claims.sub === "owner") {
    if (!ownerEmail || claims.email.toLowerCase() !== ownerEmail || claims.role !== "owner") return null;
    return { id: "owner", email: ownerEmail, name: "Propietario", role: "owner" };
  }
  const user = await db().getAdminUserById(claims.sub).catch(() => null);
  if (!user || !user.active || user.sessionVersion !== claims.ver) return null;
  return { id: user.id, email: user.email, name: user.name, role: user.role };
}

/** Etiqueta para registrar quién hizo cada cambio (historial de pedidos e inventario). */
export const actorLabel = (s: AdminSession) => `${s.name || s.email} (${s.role})`;

function sameOrigin(req: Request) {
  const origin = req.headers.get("origin");
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  try {
    return Boolean(origin && host && new URL(origin).host === host);
  } catch {
    return false;
  }
}

/** Protección de cada ruta de API del panel: origen (CSRF) + sesión + permiso. */
export async function requireAdmin(req: Request, permission: Permission = "dashboard:view") {
  const method = req.method.toUpperCase();
  if (method !== "GET" && method !== "HEAD" && !sameOrigin(req)) {
    return { session: null, error: NextResponse.json({ error: "Origen no permitido." }, { status: 403 }) } as const;
  }
  const session = await getAdminSession();
  if (!session) return { session: null, error: NextResponse.json({ error: "Sesión no válida o caducada. Vuelve a iniciar sesión." }, { status: 401 }) } as const;
  if (!can(session.role, permission)) {
    return { session: null, error: NextResponse.json({ error: "Tu rol no tiene permiso para esta acción." }, { status: 403 }) } as const;
  }
  return { session, error: null } as const;
}

/** Para páginas del panel: exige sesión y permiso o redirige. */
export async function requirePagePermission(permission: Permission): Promise<AdminSession> {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");
  if (!can(session.role, permission)) redirect("/admin?denegado=1");
  return session;
}

export async function clientIp(req?: Request) {
  const h = req?.headers ?? (await headers());
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "local";
}
