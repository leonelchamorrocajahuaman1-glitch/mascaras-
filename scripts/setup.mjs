// Crea .env.local con un secreto de sesión aleatorio y credenciales de administrador.
// Uso: npm run setup            -> genera una contraseña aleatoria
//      npm run setup -- "clave" -> usa la contraseña indicada
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { hashPassword } from "./lib-hash.mjs";

const file = ".env.local";
if (existsSync(file) && readFileSync(file, "utf8").includes("ADMIN_PASSWORD_HASH")) {
  console.log(".env.local ya existe con un administrador configurado. No se ha modificado.");
  console.log('Para cambiar la contraseña: npm run admin:hash -- "nueva-clave" y reemplaza ADMIN_PASSWORD_HASH.');
  process.exit(0);
}

const password = process.argv[2] ?? randomBytes(12).toString("base64url");
if (password.length < 10) {
  console.error("La contraseña debe tener al menos 10 caracteres.");
  process.exit(1);
}
const email = "admin@spidermasks.local";
const env = `# Generado por npm run setup — NO subas este archivo a git.
ADMIN_EMAIL=${email}
ADMIN_PASSWORD_HASH='${hashPassword(password)}'
SESSION_SECRET=${randomBytes(48).toString("base64url")}

# Opcional: base de datos Supabase (si se dejan vacías se usa data/db.json)
NEXT_PUBLIC_SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
`;
writeFileSync(file, env, "utf8");
console.log("\n✔ .env.local creado.\n");
console.log("  Panel:      http://localhost:3000/admin");
console.log(`  Email:      ${email}`);
console.log(`  Contraseña: ${password}\n`);
console.log("Guarda la contraseña: no se vuelve a mostrar (solo se almacena su hash).\n");
