// Importa modelos 3D de una carpeta a public/models (lo usa el flujo de GitHub "Importar modelos 3D").
// Uso: node scripts/import-models.mjs <carpeta>
// - Valida cada .glb/.gltf (glTF 2.0 completo, con mallas). Los inválidos se rechazan y no se copian.
// - Normaliza el nombre (minúsculas, sin espacios ni tildes) para que coincida con models.json.
import { copyFileSync, existsSync, mkdirSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { inspectGltf } from "./lib-gltf.mjs";

const src = process.argv[2];
if (!src || !existsSync(src)) {
  console.error("Uso: node scripts/import-models.mjs <carpeta-con-modelos>");
  process.exit(2);
}
const dest = path.join(process.cwd(), "public", "models");
mkdirSync(dest, { recursive: true });

const normalize = (name) =>
  name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-(?=\.)/g, "");

const files = readdirSync(src).filter((f) => /\.(glb|gltf)$/i.test(f));
if (!files.length) {
  console.error("✖ No hay archivos .glb ni .gltf para importar.");
  process.exit(1);
}
let imported = 0;
for (const f of files) {
  const full = path.join(src, f);
  const r = inspectGltf(full);
  const target = normalize(f);
  if (!r.ok) {
    console.log(`✖ ${f}: no válido — ${r.issues.join(" ")}`);
    continue;
  }
  if (target.endsWith(".gltf")) console.log(`⚠ ${f}: los .gltf necesitan sus .bin y texturas; mejor usa .glb.`);
  copyFileSync(full, path.join(dest, target));
  imported++;
  const mb = (statSync(full).size / 1048576).toFixed(2);
  console.log(`✔ ${f} → public/models/${target} (${mb} MB · ${r.stats.meshes} mallas · ${r.stats.materials.length} materiales · ${r.stats.textures} texturas)`);
  r.warnings.forEach((w) => console.log(`   ⚠ ${w}`));
}
console.log(`\n${imported} de ${files.length} modelo(s) importados.`);
process.exit(imported ? 0 : 1);
