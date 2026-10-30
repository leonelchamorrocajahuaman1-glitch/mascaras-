/**
 * Configuración del propietario del panel a partir de variables de entorno (sin pasos manuales en consola).
 *
 * Opción sencilla (Vercel): ADMIN_EMAIL + ADMIN_PASSWORD (mínimo 12 caracteres).
 * Opción avanzada:          ADMIN_EMAIL + ADMIN_PASSWORD_HASH (generado con npm run env:production).
 * SESSION_SECRET es opcional: si falta, la firma de sesión se deriva de otro secreto del servidor.
 */
export const MIN_ENV_PASSWORD = 12;

export function sessionSecretMaterial(): string | null {
  const explicit = process.env.SESSION_SECRET;
  if (explicit && explicit.length >= 32) return explicit;
  // Respaldo: deriva la clave de firma de un secreto que solo existe en el servidor.
  // Cambiar ese secreto (p. ej. la contraseña) invalida todas las sesiones abiertas.
  const fallback = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.ADMIN_PASSWORD_HASH || process.env.ADMIN_PASSWORD;
  if (fallback && fallback.length >= MIN_ENV_PASSWORD) return `spider-masks-session-v1:${fallback}`;
  return null;
}

export function ownerConfig() {
  const email = (process.env.ADMIN_EMAIL ?? "").trim().toLowerCase();
  const hash = process.env.ADMIN_PASSWORD_HASH?.trim() || "";
  const password = process.env.ADMIN_PASSWORD ?? "";
  const passwordOk = Boolean(hash) || password.length >= MIN_ENV_PASSWORD;
  const configured = Boolean(email && passwordOk && sessionSecretMaterial());
  let problem: string | null = null;
  if (!email) problem = "Falta la variable ADMIN_EMAIL.";
  else if (!hash && !password) problem = "Falta la variable ADMIN_PASSWORD.";
  else if (!passwordOk) problem = `ADMIN_PASSWORD debe tener al menos ${MIN_ENV_PASSWORD} caracteres.`;
  return { email, hash, password, configured, problem };
}
