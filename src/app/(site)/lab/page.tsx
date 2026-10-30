import type { Metadata } from "next";
import { MaskLab } from "@/components/lab/MaskLab";
import { activeProducts, shopSlugsByModel } from "@/lib/catalog";
import { availableModels } from "@/lib/assets";
import { MASK_KEYS } from "@/lib/masks";
import type { MaskKey } from "@/lib/types";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "3D Mask Lab", description: "Visualizador 3D interactivo de las máscaras SPIDER MASKS." };

export default async function LabPage({ searchParams }: { searchParams: Promise<{ model?: string }> }) {
  const { model } = await searchParams;
  const initial = (MASK_KEYS as string[]).includes(model ?? "") ? (model as MaskKey) : "classic-red";
  const products = await activeProducts();
  return (
    <div className="pt-0">
      <MaskLab standalone initialModel={initial} models={availableModels()} shopSlugs={shopSlugsByModel(products)} />
    </div>
  );
}
