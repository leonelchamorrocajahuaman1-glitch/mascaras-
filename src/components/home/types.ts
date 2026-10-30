import type { MaskKey } from "@/lib/types";

export interface ShowcaseItem {
  id: string;
  slug: string;
  name: string;
  modelKey: MaskKey;
  code: string;
  tagline: string;
  description: string;
  priceCents: number;
  compareAtCents: number | null;
  image: string | null;
  accent: string;
  inStock: boolean;
}
