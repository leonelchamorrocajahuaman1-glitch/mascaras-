import type { MaskKey } from "@/lib/types";

export interface CatalogItem {
  id: string;
  slug: string;
  name: string;
  category: MaskKey;
  categoryName: string;
  code: string;
  tagline: string;
  priceCents: number;
  compareAtCents: number | null;
  image: string | null;
  featured: boolean;
  stock: number;
  variants: { id: string; name: string; stock: number }[];
  createdAt: string;
}
