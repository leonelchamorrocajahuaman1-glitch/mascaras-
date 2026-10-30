import { NextResponse } from "next/server";
import { db, isReadOnlyDeployment, isSupabaseConfigured } from "@/lib/db";
import { HAS_PUBLIC_DIR } from "@/lib/assets";

export const dynamic = "force-dynamic";

/**
 * Diagnóstico del despliegue. Solo devuelve indicadores sí/no: nunca valores de variables ni datos privados.
 * Útil para comprobar la configuración de Vercel tras publicar: GET /api/health
 */
export async function GET() {
  const supabase = isSupabaseConfigured();
  let database: "ok" | "error" = "ok";
  let products = 0;
  let detail: string | undefined;
  try {
    products = (await db().listProducts()).length;
  } catch (err) {
    database = "error";
    detail = supabase ? "No se pudo leer Supabase: ¿ejecutaste supabase/schema.sql y son correctas las claves?" : (err as Error).message.slice(0, 120);
  }
  const checks = {
    database: supabase ? "supabase" : "local-json",
    databaseStatus: database,
    readOnly: isReadOnlyDeployment(),
    activeProducts: products,
    adminConfigured: Boolean(process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD_HASH),
    sessionSecretConfigured: (process.env.SESSION_SECRET ?? "").length >= 32,
    staticAssets: HAS_PUBLIC_DIR ? "filesystem" : "build-manifest",
    platform: process.env.VERCEL ? "vercel" : "node",
  };
  const ok = database === "ok" && checks.adminConfigured && checks.sessionSecretConfigured && !checks.readOnly;
  return NextResponse.json({ ok, ...checks, ...(detail ? { detail } : {}) }, { status: ok ? 200 : 503, headers: { "Cache-Control": "no-store" } });
}
