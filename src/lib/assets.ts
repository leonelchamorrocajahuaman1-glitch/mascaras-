import "server-only";
import { existsSync } from "node:fs";
import path from "node:path";
import { MASKS, maskModelPath } from "./masks";
import type { MaskKey, Product } from "./types";
import manifest from "@/generated/public-manifest.json";

const PUBLIC = path.join(process.cwd(), "public");
/** En Vercel /public no está dentro de las funciones: se usa el manifiesto generado en el build. */
export const HAS_PUBLIC_DIR = existsSync(path.join(PUBLIC, "images")) && process.env.SM_FORCE_MANIFEST !== "1";
const MANIFEST_FILES = new Set<string>(manifest.files);

/** Comprueba si un recurso local existe en /public (las URL remotas o subidas se aceptan tal cual). */
export function assetExists(src: string) {
  if (!src.startsWith("/") || src.startsWith("/api/")) return true;
  const clean = decodeURIComponent(src.split("?")[0]);
  return HAS_PUBLIC_DIR ? existsSync(path.join(PUBLIC, clean)) : MANIFEST_FILES.has(clean);
}

export function firstAvailable(...candidates: (string | null | undefined)[]) {
  for (const c of candidates) if (c && assetExists(c)) return c;
  return null;
}

export function renderPath(key: MaskKey) {
  return `/images/renders/${key}-v4.webp`;
}

/** Imagen principal del producto: foto subida/generada → render del modelo 3D → null (ilustración SVG). */
export function productImage(product: Pick<Product, "images" | "modelKey">) {
  return firstAvailable(...product.images, renderPath(product.modelKey));
}

/** Imágenes reales disponibles del producto (sin el render de respaldo). */
export function productGallery(product: Pick<Product, "images" | "modelKey">) {
  const list = product.images.filter(assetExists);
  if (!list.length) {
    const r = firstAvailable(renderPath(product.modelKey));
    if (r) list.push(r);
  }
  return list;
}

/** Modelos GLB presentes en /public/models (si no hay, el laboratorio usa el modelo procedural). */
export function availableModels(): Partial<Record<MaskKey, string>> {
  const out: Partial<Record<MaskKey, string>> = {};
  for (const m of MASKS) {
    const p = maskModelPath(m.key);
    if (assetExists(p)) out[m.key] = p;
  }
  return out;
}

export function heroImage(name: string) {
  return firstAvailable(`/images/hero/${name}`);
}

export function detailImage(name: string) {
  return firstAvailable(`/images/details/${name}`);
}

export function backgroundImage(name: string) {
  return firstAvailable(`/images/backgrounds/${name}`);
}
