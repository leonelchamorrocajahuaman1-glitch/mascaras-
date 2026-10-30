import { Suspense } from "react";
import type { Metadata } from "next";
import { Catalog } from "@/components/shop/Catalog";
import type { CatalogItem } from "@/components/shop/types";
import { activeProducts } from "@/lib/catalog";
import { productImage } from "@/lib/assets";
import { MASK_BY_KEY } from "@/lib/masks";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Shop", description: "Catálogo de máscaras SPIDER MASKS." };

export default async function ShopPage() {
  const products = await activeProducts();
  const items: CatalogItem[] = products.map((p) => ({
    id: p.id,
    slug: p.slug,
    name: p.name,
    category: p.category,
    categoryName: MASK_BY_KEY[p.category]?.name ?? p.category,
    code: MASK_BY_KEY[p.modelKey]?.code ?? "",
    tagline: p.tagline,
    priceCents: p.priceCents,
    compareAtCents: p.compareAtCents,
    image: productImage(p),
    featured: p.featured,
    stock: p.variants.reduce((s, v) => s + v.stock, 0),
    variants: p.variants.map((v) => ({ id: v.id, name: v.name, stock: v.stock })),
    createdAt: p.createdAt,
  }));

  return (
    <div className="min-h-screen pt-32">
      <header className="relative overflow-hidden px-[var(--gutter)] pb-14">
        <div aria-hidden className="pointer-events-none absolute -right-[10vw] -top-[20vw] h-[60vw] w-[60vw] rounded-full" style={{ background: "radial-gradient(closest-side, rgba(225,18,31,0.22), transparent)" }} />
        <p className="mb-6 font-mono text-[11px] uppercase tracking-[0.35em] text-blood">( Store ) — Demo</p>
        <h1 className="font-display text-[clamp(88px,15vw,280px)] font-black uppercase leading-[0.78] tracking-tight">
          The <span className="text-outline">Store</span>
        </h1>
        <p className="mt-8 max-w-lg text-[15px] leading-relaxed text-bone/70">
          Catálogo completo de la colección. Precios demostrativos: puedes añadir al carrito y registrar pedidos, pero aún no se realizan cobros.
        </p>
      </header>
      <Suspense>
        <Catalog items={items} />
      </Suspense>
      <div className="h-32" />
    </div>
  );
}
