// Uso: npm run admin:hash -- "MiContraseñaSegura"
import { hashPassword } from "./lib-hash.mjs";

const password = process.argv[2];
if (!password || password.length < 10) {
  console.error('Uso: npm run admin:hash -- "contraseña-de-al-menos-10-caracteres"');
  process.exit(1);
}
console.log("\nCopia esta línea en .env.local (las comillas simples evitan problemas con el símbolo $):\n");
console.log(`ADMIN_PASSWORD_HASH='${hashPassword(password)}'\n`);
