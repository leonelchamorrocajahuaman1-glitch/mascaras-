import { Suspense } from "react";
import type { Metadata } from "next";
import { Box } from "lucide-react";
import { Catalog } from "@/components/shop/Catalog";
import { TLink } from "@/components/experience/RouteTransition";
import type { CatalogItem } from "@/components/shop/types";
import { activeProducts } from "@/lib/catalog";
import { db } from "@/lib/db";
import Image from "next/image";
import { backgroundImage, productImage } from "@/lib/assets";
import { MASK_BY_KEY } from "@/lib/masks";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Shop", description: "Catálogo de máscaras SPIDER MASKS." };

export default async function ShopPage() {
  const [products, categories] = await Promise.all([activeProducts(), db().listCategories()]);
  const catName = new Map(categories.map((c) => [c.slug, c.name]));
  const items: CatalogItem[] = products.map((p) => ({
    id: p.id,
    slug: p.slug,
    name: p.name,
    category: p.category,
    categoryName: catName.get(p.category) ?? p.category,
    modelKey: p.modelKey,
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

  const backdrop = backgroundImage("store-backdrop.webp");
  return (
    <div className="min-h-screen pt-32">
      <header className="relative overflow-hidden px-[var(--gutter)] pb-14">
        {backdrop && (
          <div aria-hidden className="absolute inset-0 -top-32">
            <Image src={backdrop} alt="" fill sizes="100vw" className="object-cover opacity-40" />
            <div className="absolute inset-0 bg-gradient-to-b from-ink/40 via-ink/60 to-ink" />
          </div>
        )}
        <div aria-hidden className="pointer-events-none absolute -right-[10vw] -top-[20vw] h-[60vw] w-[60vw] rounded-full" style={{ background: "radial-gradient(closest-side, rgba(225,18,31,0.22), transparent)" }} />
        <p className="relative mb-6 font-mono text-[11px] uppercase tracking-[0.35em] text-blood">( Store ) — Demo</p>
        <h1 className="relative font-display text-[clamp(88px,15vw,280px)] font-black uppercase leading-[0.78] tracking-tight">
          The <span className="text-outline">Store</span>
        </h1>
        <p className="relative mt-8 max-w-lg text-[15px] leading-relaxed text-bone/70">
          Catálogo completo de la colección. Precios demostrativos: puedes añadir al carrito y registrar pedidos, pero aún no se realizan cobros.
        </p>
        <TLink
          href="/shop/3d"
          className="relative mt-8 inline-flex items-center gap-3 rounded-full border border-bone/20 px-6 py-3 font-mono text-[11px] uppercase tracking-[0.25em] transition hover:border-blood"
        >
          <Box size={15} className="text-blood" /> Galería 3D interactiva
        </TLink>
      </header>
      <Suspense>
        <Catalog items={items} categories={categories.filter((c) => products.some((p) => p.category === c.slug)).map((c) => ({ slug: c.slug, name: c.name }))} />
      </Suspense>
      <div className="h-32" />
    </div>
  );
}
