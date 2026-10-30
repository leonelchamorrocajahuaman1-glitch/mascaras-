import "server-only";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { inspectGltf } from "../../scripts/lib-gltf.mjs";
import { db } from "./db";
import type { ModelAsset } from "./types";

/**
 * Los modelos 3D se registran en la base de datos (tabla model_assets):
 *  - Los archivos copiados a mano en public/models se detectan y registran automáticamente.
 *  - Los subidos desde el panel se guardan en data/models (local) o Supabase Storage.
 * La metadata (autor, origen, licencia, rotación) se edita en /admin/modelos-3d.
 */

const PUBLIC_DIR = path.join(process.cwd(), "public", "models");

export interface ClientModel {
  url: string;
  name: string;
  rotationY: number;
  rotationX: number;
  author?: string;
  license?: string;
  sourceUrl?: string;
}

interface LegacyMeta {
  name?: string;
  author?: string;
  sourceUrl?: string;
  license?: string;
  rotationY?: number;
  rotationX?: number;
}

function legacyMeta(): Record<string, LegacyMeta> {
  try {
    return JSON.parse(readFileSync(path.join(PUBLIC_DIR, "models.json"), "utf8"));
  } catch {
    return {};
  }
}

export const prettifyFileName = (file: string) =>
  file
    .replace(/\.(glb|gltf)$/i, "")
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

const g = globalThis as unknown as { __smModelSync?: { at: number; sig: string } };

/** Registra/actualiza en la base de datos los archivos presentes en public/models (con caché por firma de carpeta). */
export async function syncPublicModels() {
  if (!existsSync(PUBLIC_DIR)) return;
  const files = readdirSync(PUBLIC_DIR).filter((f) => /\.(glb|gltf)$/i.test(f));
  const sig = files.map((f) => `${f}:${statSync(path.join(PUBLIC_DIR, f)).mtimeMs}`).join("|");
  if (g.__smModelSync?.sig === sig) return;
  const meta = legacyMeta();
  for (const file of files) {
    const full = path.join(PUBLIC_DIR, file);
    const r = inspectGltf(full);
    const m = meta[file] ?? {};
    await db().upsertModelAsset({
      fileName: file,
      url: `/models/${encodeURIComponent(file)}`,
      source: "public",
      name: m.name || prettifyFileName(file),
      author: m.author ?? "",
      sourceUrl: m.sourceUrl ?? "",
      license: m.license ?? "",
      rotationX: m.rotationX ?? 0,
      rotationY: m.rotationY ?? 0,
      sizeBytes: statSync(full).size,
      valid: r.ok,
      issues: r.issues,
      warnings: r.warnings,
      stats: r.stats,
    });
  }
  g.__smModelSync = { at: Date.now(), sig };
}

/** ¿Sigue existiendo el archivo de un modelo? (los de public/models pueden borrarse a mano). */
export function modelFileMissing(m: ModelAsset) {
  if (m.source !== "public") return false;
  return !existsSync(path.join(PUBLIC_DIR, decodeURIComponent(m.fileName)));
}

export async function listModelAssets() {
  await syncPublicModels();
  return db().listModelAssets();
}

export function toClientModel(m: ModelAsset): ClientModel {
  return {
    url: m.url,
    name: m.name,
    rotationY: m.rotationY,
    rotationX: m.rotationX,
    author: m.author || undefined,
    license: m.license || undefined,
    sourceUrl: m.sourceUrl || undefined,
  };
}

/** Modelos válidos y presentes, indexados por URL. */
export async function validModelMap() {
  const list = (await listModelAssets()).filter((m) => m.valid && !modelFileMissing(m));
  return new Map(list.map((m) => [m.url, toClientModel(m)]));
}

export async function validModels() {
  return [...(await validModelMap()).values()];
}

/** Modelo listo para el visor (null si falta, no existe o es inválido). */
export async function resolveModel(url: string | null | undefined) {
  if (!url) return null;
  return (await validModelMap()).get(url) ?? null;
}
