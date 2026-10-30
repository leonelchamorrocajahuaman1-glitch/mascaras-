import "server-only";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "./session";

export async function getAdminSession() {
  const jar = await cookies();
  return verifySessionToken(jar.get(SESSION_COOKIE)?.value);
}

/** Comprueba sesión y origen (protección CSRF) en cada ruta de API administrativa. */
export async function requireAdmin(req: Request) {
  const method = req.method.toUpperCase();
  if (method !== "GET" && method !== "HEAD") {
    const origin = req.headers.get("origin");
    const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
    if (!origin || !host || new URL(origin).host !== host) {
      return { session: null, error: NextResponse.json({ error: "Origen no permitido." }, { status: 403 }) };
    }
  }
  const session = await getAdminSession();
  if (!session) return { session: null, error: NextResponse.json({ error: "No autorizado." }, { status: 401 }) };
  return { session, error: null };
}

export function clientIp(req: Request) {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "local";
}
