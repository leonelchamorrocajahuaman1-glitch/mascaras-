import { notFound } from "next/navigation";
import { StudioRender } from "@/components/three/StudioRender";

export const metadata = { robots: { index: false } };

/** Herramienta de desarrollo para renderizar fotos de producto del modelo procedural. No existe en producción. */
export default async function StudioPage({ searchParams }: { searchParams: Promise<{ model?: string; shot?: string }> }) {
  if (process.env.NODE_ENV === "production") notFound();
  const { model = "classic-red", shot = "front" } = await searchParams;
  return <StudioRender model={model} shot={shot} />;
}
