import "server-only";
import { db } from "./db";
import { MASK_BY_KEY } from "./masks";
import { productImage } from "./assets";
import type { MaskKey, Product } from "./types";
import type { ShowcaseItem } from "@/components/home/types";

export function toShowcase(p: Product): ShowcaseItem {
  const mask = MASK_BY_KEY[p.modelKey] ?? MASK_BY_KEY["classic-red"];
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    modelKey: p.modelKey,
    code: mask.code,
    tagline: p.tagline,
    description: p.description,
    priceCents: p.priceCents,
    compareAtCents: p.compareAtCents,
    image: productImage(p),
    accent: mask.accent,
    inStock: p.variants.some((v) => v.stock > 0),
  };
}

/** Un producto por modelo para enlazar el laboratorio 3D con la tienda. */
export function shopSlugsByModel(products: Product[]) {
  const out: Partial<Record<MaskKey, string>> = {};
  for (const p of products) if (!out[p.modelKey]) out[p.modelKey] = p.slug;
  return out;
}

export async function activeProducts() {
  return db().listProducts();
}
