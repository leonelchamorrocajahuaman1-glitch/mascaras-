/** Detección de entorno de la base de datos (sin dependencias de servidor para poder usarlo en cualquier sitio). */

export function isSupabaseConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

/**
 * En Vercel (y plataformas serverless) el sistema de archivos es de solo lectura y efímero:
 * la base de datos local en JSON no puede guardar pedidos ni cambios. Sin Supabase configurado
 * la tienda funciona en modo de solo lectura (catálogo visible, pedidos y escrituras desactivados).
 * SM_READ_ONLY=1 fuerza este modo para probarlo en local.
 */
export function isReadOnlyDeployment() {
  if (isSupabaseConfigured()) return false;
  return process.env.VERCEL === "1" || process.env.SM_READ_ONLY === "1";
}

export const READ_ONLY_MESSAGE =
  "Base de datos de producción no configurada: configura Supabase (NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY) para guardar pedidos y cambios.";
