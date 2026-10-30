// Inspección ligera de archivos glTF/GLB sin dependencias (compartida por el script y el servidor).
import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const SUPPORTED_EXT = new Set(["KHR_draco_mesh_compression", "EXT_meshopt_compression", "KHR_materials_emissive_strength", "KHR_materials_clearcoat", "KHR_materials_transmission", "KHR_materials_ior", "KHR_materials_specular", "KHR_materials_sheen", "KHR_materials_volume", "KHR_texture_transform", "KHR_mesh_quantization", "KHR_materials_unlit", "EXT_texture_webp", "KHR_texture_basisu"]);

/** Devuelve { ok, issues[], warnings[], stats } para un archivo .glb o .gltf. */
export function inspectGltf(file) {
  const issues = [];
  const warnings = [];
  const size = statSync(file).size;
  let json = null;
  try {
    if (file.toLowerCase().endsWith(".glb")) {
      const buf = readFileSync(file);
      if (buf.length < 20 || buf.toString("ascii", 0, 4) !== "glTF") issues.push("No es un GLB válido (falta la firma glTF). ¿Descargaste otro formato renombrado?");
      else {
        const version = buf.readUInt32LE(4);
        if (version !== 2) issues.push(`Versión glTF ${version} no soportada (se necesita 2.0).`);
        const declared = buf.readUInt32LE(8);
        if (declared !== buf.length) issues.push(`Archivo incompleto o corrupto (declara ${declared} bytes y tiene ${buf.length}).`);
        const chunkLen = buf.readUInt32LE(12);
        if (buf.toString("ascii", 16, 20) !== "JSON") issues.push("Primer bloque del GLB no es JSON.");
        else json = JSON.parse(buf.toString("utf8", 20, 20 + chunkLen));
      }
    } else {
      json = JSON.parse(readFileSync(file, "utf8"));
      for (const b of [...(json.buffers ?? []), ...(json.images ?? [])]) {
        if (b.uri && !b.uri.startsWith("data:") && !existsSync(path.join(path.dirname(file), decodeURIComponent(b.uri)))) {
          issues.push(`Falta el recurso externo "${b.uri}" junto al .gltf (copia también los .bin y texturas, o usa GLB).`);
        }
      }
    }
  } catch (err) {
    issues.push(`No se pudo leer: ${err.message}`);
  }

  const stats = { sizeMB: +(size / 1024 / 1024).toFixed(2), meshes: 0, materials: [], textures: 0, animations: 0, extensions: [], generator: "" };
  if (json) {
    if (!json.asset || !String(json.asset.version).startsWith("2")) issues.push("Falta asset.version 2.0.");
    stats.meshes = json.meshes?.length ?? 0;
    stats.materials = (json.materials ?? []).map((m, i) => m.name || `material_${i}`);
    stats.textures = json.textures?.length ?? 0;
    stats.animations = json.animations?.length ?? 0;
    stats.extensions = json.extensionsUsed ?? [];
    stats.generator = json.asset?.generator ?? "";
    if (!stats.meshes) issues.push("El archivo no contiene mallas.");
    for (const ext of json.extensionsRequired ?? []) {
      if (!SUPPORTED_EXT.has(ext)) issues.push(`Extensión requerida no soportada: ${ext}.`);
    }
    if (stats.extensions.includes("KHR_texture_basisu")) warnings.push("Usa texturas KTX2/Basis: conviértelas a WebP con gltf-transform para máxima compatibilidad.");
  }
  if (size > 25 * 1024 * 1024) warnings.push(`Pesa ${stats.sizeMB} MB: optimízalo (objetivo < 8 MB) con gltf-transform.`);
  else if (size > 8 * 1024 * 1024) warnings.push(`Pesa ${stats.sizeMB} MB: conviene optimizarlo para móviles.`);
  return { ok: issues.length === 0, issues, warnings, stats };
}
