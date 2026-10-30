// Uso: npm run models:check — valida todos los modelos de public/models y su metadata.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { inspectGltf } from "./lib-gltf.mjs";

const dir = path.join(process.cwd(), "public", "models");
const files = existsSync(dir) ? readdirSync(dir).filter((f) => /\.(glb|gltf)$/i.test(f)) : [];
let meta = {};
const metaFile = path.join(dir, "models.json");
if (existsSync(metaFile)) {
  try {
    meta = JSON.parse(readFileSync(metaFile, "utf8"));
  } catch (e) {
    console.error(`✖ models.json no es JSON válido: ${e.message}`);
    process.exitCode = 1;
  }
}

if (!files.length) {
  console.log("No hay modelos en public/models. Copia allí tus archivos .glb y vuelve a ejecutar este comando.");
  process.exit(0);
}

let bad = 0;
for (const f of files) {
  if (/[^a-z0-9._-]/i.test(f)) console.log(`⚠ ${f}: renómbralo sin espacios ni tildes (p. ej. ${f.toLowerCase().replace(/[^a-z0-9.]+/g, "-")}).`);
  const r = inspectGltf(path.join(dir, f));
  const m = meta[f];
  console.log(`${r.ok ? "✔" : "✖"} /models/${f}  ${r.stats.sizeMB} MB · ${r.stats.meshes} mallas · ${r.stats.materials.length} materiales · ${r.stats.textures} texturas`);
  if (r.stats.materials.length) console.log(`    materiales: ${r.stats.materials.join(", ")}`);
  if (r.stats.extensions.length) console.log(`    extensiones: ${r.stats.extensions.join(", ")}`);
  if (m) console.log(`    metadata: ${m.name ?? "(sin nombre)"} · autor: ${m.author ?? "?"} · licencia: ${m.license ?? "NO INDICADA"}`);
  else console.log("    metadata: ninguna (añádela en public/models/models.json: nombre, autor, origen y licencia)");
  r.issues.forEach((i) => console.log(`    ✖ ${i}`));
  r.warnings.forEach((w) => console.log(`    ⚠ ${w}`));
  if (!r.ok) bad++;
}
for (const key of Object.keys(meta)) if (!files.includes(key)) console.log(`⚠ models.json menciona "${key}" pero el archivo no existe.`);
console.log(bad ? `\n${bad} modelo(s) con errores.` : `\nTodos los modelos (${files.length}) son válidos.`);
process.exitCode = bad ? 1 : process.exitCode;
