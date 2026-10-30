import type { Metadata } from "next";
import { Box } from "lucide-react";
import { ModelGallery, type GalleryItem } from "@/components/shop/ModelGallery";
import { TLink } from "@/components/experience/RouteTransition";
import { activeProducts } from "@/lib/catalog";
import { listModelAssets, validModelMap } from "@/lib/models";
import { MASK_BY_KEY } from "@/lib/masks";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Galería 3D", description: "Catálogo con vista previa 3D interactiva de cada máscara." };

export default async function Gallery3DPage() {
  const [products, models, files] = await Promise.all([activeProducts(), validModelMap(), listModelAssets()]);
  const items: GalleryItem[] = [];
  const pending: { slug: string; name: string }[] = [];
  for (const p of products) {
    const model = p.modelUrl ? models.get(p.modelUrl) : undefined;
    if (!model) {
      pending.push({ slug: p.slug, name: p.name });
      continue;
    }
    items.push({
      id: p.id,
      slug: p.slug,
      name: p.name,
      code: MASK_BY_KEY[p.modelKey]?.code ?? "",
      priceCents: p.priceCents,
      inStock: p.variants.some((v) => v.stock > 0),
      model,
    });
  }

  return (
    <div className="min-h-screen pb-32 pt-32">
      <header className="px-[var(--gutter)] pb-12">
        <p className="mb-6 font-mono text-[11px] uppercase tracking-[0.35em] text-blood">( Store ) — Modelos reales</p>
        <h1 className="font-display text-[clamp(80px,13vw,240px)] font-black uppercase leading-[0.8] tracking-tight">
          3D <span className="text-outline">Gallery</span>
        </h1>
        <p className="mt-8 max-w-xl text-[15px] leading-relaxed text-bone/70">
          Cada máscara se muestra con su archivo 3D. Arrastra para girarla, pellizca o usa + / − para ampliar, elige un ángulo y haz doble clic para restablecer.
        </p>
        <TLink href="/shop" className="mt-6 inline-block font-mono text-[11px] uppercase tracking-[0.25em] text-steel hover:text-bone">← Volver al catálogo</TLink>
      </header>

      {items.length ? (
        <ModelGallery items={items} />
      ) : (
        <div className="mx-[var(--gutter)] flex flex-col items-start gap-4 border border-dashed border-bone/20 p-8">
          <Box className="text-blood" />
          <p className="font-display text-4xl font-black uppercase">Aún no hay modelos 3D asignados</p>
          <p className="max-w-xl text-sm leading-relaxed text-steel">
            {files.length
              ? `Hay ${files.length} modelo(s) registrados, pero ningún producto activo los usa todavía. Asígnalos desde el panel: Modelos 3D.`
              : "Sube tus archivos .glb desde el panel de administración (Modelos 3D) o cópialos en public/models, y asígnalos a cada producto."}
          </p>
        </div>
      )}

      {pending.length > 0 && items.length > 0 && (
        <section aria-label="Pendientes de modelo 3D" className="mt-16 px-[var(--gutter)]">
          <p className="mb-4 font-mono text-[10px] uppercase tracking-[0.3em] text-steel">Sin modelo 3D todavía</p>
          <ul className="flex flex-wrap gap-2">
            {pending.map((p) => (
              <li key={p.slug}>
                <TLink href={`/shop/${p.slug}`} className="rounded-full border border-bone/15 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.2em] text-bone/70 hover:border-bone/40">
                  {p.name}
                </TLink>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
