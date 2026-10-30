// Genera src/generated/public-manifest.json con los archivos de public/images y public/models
// (y la validación de cada modelo). En Vercel las funciones del servidor no incluyen /public,
// así que el servidor consulta este manifiesto en lugar de leer el disco.
// Se ejecuta automáticamente antes de `npm run dev` y `npm run build`.
import { existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { inspectGltf } from "./lib-gltf.mjs";

const root = path.join(process.cwd(), "public");
const files = [];
function walk(dir) {
  if (!existsSync(dir)) return;
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) walk(full);
    else if (!name.startsWith(".")) files.push("/" + path.relative(root, full).split(path.sep).join("/"));
  }
}
walk(path.join(root, "images"));
walk(path.join(root, "models"));

const models = {};
for (const f of files.filter((f) => /^\/models\/[^/]+\.(glb|gltf)$/i.test(f))) {
  const full = path.join(root, ...f.split("/").filter(Boolean));
  models[f] = { sizeBytes: statSync(full).size, ...inspectGltf(full) };
}

mkdirSync(path.join(process.cwd(), "src", "generated"), { recursive: true });
writeFileSync(path.join(process.cwd(), "src", "generated", "public-manifest.json"), JSON.stringify({ files: files.sort(), models }, null, 2) + "\n");
console.log(`public-manifest: ${files.length} archivos, ${Object.keys(models).length} modelo(s) 3D.`);
