import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { productGallery, productImage } from "@/lib/assets";
import { MASK_BY_KEY } from "@/lib/masks";
import { formatMoney, pad } from "@/lib/format";
import { siteConfig } from "@/lib/config";
import { ProductImage } from "@/components/shop/ProductImage";
import { ProductPurchase } from "@/components/shop/ProductPurchase";
import { TLink } from "@/components/experience/RouteTransition";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const product = await db().getProductBySlug((await params).slug);
  return product ? { title: product.name, description: product.tagline } : { title: "No encontrado" };
}

export default async function ProductPage({ params }: Params) {
  const { slug } = await params;
  const product = await db().getProductBySlug(slug);
  if (!product || !product.active) notFound();

  const mask = MASK_BY_KEY[product.modelKey] ?? MASK_BY_KEY["classic-red"];
  const gallery = productGallery(product);
  const all = await db().listProducts();
  const related = all.filter((p) => p.id !== product.id).slice(0, 3);

  return (
    <div className="pt-28">
      <nav aria-label="Ruta" className="px-[var(--gutter)] font-mono text-[10px] uppercase tracking-[0.25em] text-steel">
        <TLink href="/shop" className="hover:text-bone">Shop</TLink> <span className="mx-2">/</span> <span className="text-bone">{product.name}</span>
      </nav>

      <div className="mt-8 grid gap-10 px-[var(--gutter)] lg:grid-cols-[1.15fr_1fr] lg:gap-16">
        <div className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <div className="relative aspect-[4/5] overflow-hidden bg-coal">
            <div className="absolute inset-0" style={{ background: `radial-gradient(60% 50% at 50% 45%, ${mask.accent}30, transparent 70%)` }} />
            <ProductImage src={gallery[0] ?? null} alt={product.name} maskKey={product.modelKey} priority sizes="(max-width: 1024px) 100vw, 55vw" className="h-full w-full" />
            <div className="hud-corners pointer-events-none absolute inset-5" />
            <span className="absolute bottom-6 left-6 font-mono text-[10px] uppercase tracking-[0.3em] text-bone/70">{mask.code} / {product.name}</span>
          </div>
          {gallery.length > 1 && (
            <div className="grid grid-cols-3 gap-4">
              {gallery.slice(1, 4).map((src) => (
                <div key={src} className="relative aspect-square overflow-hidden bg-coal">
                  <ProductImage src={src} alt={product.name} maskKey={product.modelKey} sizes="20vw" className="h-full w-full" />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="pb-20">
          <p className="font-mono text-[11px] uppercase tracking-[0.35em] text-blood">{mask.code} — {mask.name}</p>
          <h1 className="mt-4 font-display text-[clamp(64px,9vw,160px)] font-black uppercase leading-[0.82]">{product.name}</h1>
          <p className="mt-5 font-display text-2xl font-bold uppercase tracking-wide text-blood">{product.tagline}</p>
          <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-bone/70">{product.description}</p>
          <div className="mt-10">
            <ProductPurchase
              product={{
                id: product.id,
                slug: product.slug,
                name: product.name,
                modelKey: product.modelKey,
                image: productImage(product),
                priceCents: product.priceCents,
                compareAtCents: product.compareAtCents,
                variants: product.variants,
              }}
            />
          </div>
          <dl className="mt-12 divide-y divide-bone/10 border-y border-bone/10 text-sm">
            <div className="flex justify-between py-4"><dt className="text-steel">Envío</dt><dd>{formatMoney(siteConfig.shippingCents)} · gratis desde {formatMoney(siteConfig.freeShippingFromCents)}</dd></div>
            <div className="flex justify-between py-4"><dt className="text-steel">Pago</dt><dd>Demostración — sin cobro real</dd></div>
            <div className="flex justify-between py-4"><dt className="text-steel">Modelo 3D</dt><dd>{mask.name}</dd></div>
          </dl>
        </div>
      </div>

      {related.length > 0 && (
        <section aria-label="Otras máscaras" className="mt-10 border-t border-bone/10 px-[var(--gutter)] py-20">
          <p className="mb-10 font-display text-6xl font-black uppercase">También en la <span className="text-outline">colección</span></p>
          <ul className="divide-y divide-bone/10 border-y border-bone/10">
            {related.map((p, i) => (
              <li key={p.id}>
                <TLink href={`/shop/${p.slug}`} className="group flex items-center justify-between gap-6 py-6">
                  <span className="flex items-baseline gap-6">
                    <span className="font-mono text-xs text-steel">{pad(i + 1)}</span>
                    <span className="font-display text-5xl font-black uppercase transition group-hover:translate-x-2 group-hover:text-blood">{p.name}</span>
                  </span>
                  <span className="font-display text-3xl font-black tabular-nums">{formatMoney(p.priceCents)}</span>
                </TLink>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
