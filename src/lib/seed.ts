import { MASKS } from "./masks";
import type { Product } from "./types";

const PRICES: Record<string, [number, number | null]> = {
  "classic-red": [14900, null],
  "black-symbiote": [17900, 19900],
  "iron-edition": [24900, null],
  "future-vision": [27900, null],
  "stealth-edition": [18900, null],
  "custom-series": [21900, null],
};

const STOCK = [6, 12, 9, 3, 0, 8, 14, 5, 2, 7, 11, 4];

/** Catálogo inicial de demostración. Precios y existencias son ficticios. */
export function seedProducts(): Product[] {
  const now = new Date().toISOString();
  return MASKS.map((mask, i) => {
    const [price, compare] = PRICES[mask.key];
    const sizes = ["S/M", "L/XL"];
    return {
      id: `prd_${mask.key.replace(/-/g, "_")}`,
      slug: mask.key,
      name: mask.name,
      category: mask.key,
      tagline: mask.tagline,
      description: mask.description,
      priceCents: price,
      compareAtCents: compare,
      images: [`/images/masks/${mask.key}.webp`],
      modelKey: mask.key,
      modelUrl: null,
      featured: i < 4,
      active: true,
      variants: sizes.map((size, j) => ({
        id: `var_${mask.key.replace(/-/g, "_")}_${j}`,
        name: `Talla ${size}`,
        sku: `${mask.code.replace("—", "")}-${size.replace("/", "")}`,
        stock: STOCK[(i * 2 + j) % STOCK.length],
        priceCents: null,
      })),
      createdAt: now,
      updatedAt: now,
    };
  });
}
