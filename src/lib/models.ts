import "server-only";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { inspectGltf, type GltfInspection } from "../../scripts/lib-gltf.mjs";

/** Metadata opcional por archivo en public/models/models.json. */
export interface ModelMeta {
  name?: string;
  author?: string;
  sourceUrl?: string;
  license?: string;
  /** Rotación extra en grados (Y) si el modelo no mira hacia +Z. */
  rotationY?: number;
  /** Rotación extra en grados (X) si el modelo está tumbado. */
  rotationX?: number;
}

export interface ModelInfo extends ModelMeta {
  url: string;
  file: string;
  name: string;
  ok: boolean;
  inspection: GltfInspection;
}

/** Datos mínimos que necesita el cliente para cargar un modelo. */
export interface ClientModel {
  url: string;
  name: string;
  rotationY: number;
  rotationX: number;
  author?: string;
  license?: string;
  sourceUrl?: string;
}

const DIR = path.join(process.cwd(), "public", "models");
const cache = new Map<string, { mtime: number; info: GltfInspection }>();

function readMeta(): Record<string, ModelMeta> {
  try {
    return JSON.parse(readFileSync(path.join(DIR, "models.json"), "utf8"));
  } catch {
    return {};
  }
}

const prettify = (file: string) =>
  file
    .replace(/\.(glb|gltf)$/i, "")
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

/** Todos los .glb/.gltf de public/models con su validación (cacheada por fecha de modificación). */
export function listModels(): ModelInfo[] {
  if (!existsSync(DIR)) return [];
  const meta = readMeta();
  return readdirSync(DIR)
    .filter((f) => /\.(glb|gltf)$/i.test(f))
    .sort()
    .map((file) => {
      const full = path.join(DIR, file);
      const mtime = statSync(full).mtimeMs;
      let hit = cache.get(full);
      if (!hit || hit.mtime !== mtime) {
        hit = { mtime, info: inspectGltf(full) };
        cache.set(full, hit);
      }
      const m = meta[file] ?? {};
      return { ...m, url: `/models/${encodeURIComponent(file)}`, file, name: m.name || prettify(file), ok: hit.info.ok, inspection: hit.info };
    });
}

export function toClientModel(m: ModelInfo): ClientModel {
  return {
    url: m.url,
    name: m.name,
    rotationY: m.rotationY ?? 0,
    rotationX: m.rotationX ?? 0,
    author: m.author,
    license: m.license,
    sourceUrl: m.sourceUrl,
  };
}

/** Modelo válido para una URL de producto (null si falta o está corrupto: se usará el modelo procedural). */
export function resolveModel(url: string | null | undefined): ClientModel | null {
  if (!url) return null;
  const m = listModels().find((x) => x.url === url || `/models/${x.file}` === url);
  return m && m.ok ? toClientModel(m) : null;
}

export function validModels() {
  return listModels().filter((m) => m.ok).map(toClientModel);
}
