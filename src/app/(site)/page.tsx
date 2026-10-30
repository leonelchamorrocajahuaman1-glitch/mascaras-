import { Hero } from "@/components/home/Hero";
import { Collection } from "@/components/home/Collection";
import { Details } from "@/components/home/Details";
import { DETAIL_CHAPTERS } from "@/components/home/details-data";
import { ShopCta } from "@/components/home/ShopCta";
import { MaskLab } from "@/components/lab/MaskLab";
import { LazyMount } from "@/components/experience/LazyMount";
import { activeProducts, labGlbModels, shopSlugsByModel, toShowcase } from "@/lib/catalog";
import { availableModels, detailImage, heroImage } from "@/lib/assets";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const products = await activeProducts();
  const items = products.map(toShowcase);
  const detailImages = Object.fromEntries(DETAIL_CHAPTERS.map((c) => [c.file, detailImage(c.file)]));
  return (
    <>
      <Hero poster={heroImage("hero-poster.webp")} />
      <Collection items={items} />
      <LazyMount>
        <MaskLab models={availableModels()} glbModels={labGlbModels(products)} shopSlugs={shopSlugsByModel(products)} />
      </LazyMount>
      <Details images={detailImages} />
      <ShopCta />
    </>
  );
}
