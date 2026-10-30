// Genera los valores de las variables de entorno para PRODUCCIÓN (Vercel). No escribe ningún archivo.
// Uso: npm run env:production -- "tu-email@dominio.com" "contraseña-larga-y-única"
// Copia la salida en Vercel → Project → Settings → Environment Variables (entorno Production).
import { randomBytes } from "node:crypto";
import { hashPassword } from "./lib-hash.mjs";

const [email, password] = process.argv.slice(2);
if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || !password || password.length < 12) {
  console.error('Uso: npm run env:production -- "tu-email@dominio.com" "contraseña de al menos 12 caracteres"');
  process.exit(1);
}
console.log("\nVariables para Vercel (Settings → Environment Variables → Production).");
console.log("Usa una contraseña distinta a la de tu PC. Estos valores son SECRETOS: no los compartas ni los subas a GitHub.\n");
console.log(`ADMIN_EMAIL=${email.toLowerCase()}`);
console.log(`ADMIN_PASSWORD_HASH=${hashPassword(password)}`);
console.log(`SESSION_SECRET=${randomBytes(48).toString("base64url")}`);
console.log("\nAdemás, desde Supabase → Project Settings → API:");
console.log("NEXT_PUBLIC_SUPABASE_URL=<Project URL>");
console.log("SUPABASE_SERVICE_ROLE_KEY=<service_role secret>\n");
