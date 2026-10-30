"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Box, ImageIcon } from "lucide-react";
import type { MaskKey } from "@/lib/types";
import type { ViewerModel } from "../three/ModelViewer";
import { ProductImage } from "./ProductImage";

const ModelViewer = dynamic(() => import("../three/ModelViewer").then((m) => m.ModelViewer), {
  ssr: false,
  loading: () => <div className="flex h-full items-center justify-center font-mono text-[10px] uppercase tracking-[0.3em] text-steel">Preparando visor 3D…</div>,
});

/** Galería principal de la ficha: visor 3D del GLB real (si existe) y fotografía. */
export function ProductMedia({
  name,
  image,
  maskKey,
  accent,
  model,
  code,
}: {
  name: string;
  image: string | null;
  maskKey: MaskKey;
  accent: string;
  model: (ViewerModel & { author?: string; license?: string; sourceUrl?: string }) | null;
  code: string;
}) {
  const [tab, setTab] = useState<"3d" | "photo">(model ? "3d" : "photo");
  const photo = <ProductImage src={image} alt={name} maskKey={maskKey} priority sizes="(max-width: 1024px) 100vw, 55vw" className="h-full w-full" />;
  return (
    <div className="space-y-3">
      <div className="relative aspect-[4/5] overflow-hidden bg-coal">
        <div className="pointer-events-none absolute inset-0" style={{ background: `radial-gradient(60% 50% at 50% 45%, ${accent}30, transparent 70%)` }} />
        {tab === "3d" && model ? (
          <ModelViewer model={model} label={`Modelo 3D interactivo de ${name}`} className="absolute inset-0" fallback={photo} />
        ) : (
          <>
            {photo}
            <div className="hud-corners pointer-events-none absolute inset-5" />
            <span className="absolute bottom-6 left-6 font-mono text-[10px] uppercase tracking-[0.3em] text-bone/70">{code} / {name}</span>
          </>
        )}
      </div>
      {model && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-2" role="tablist" aria-label="Vista del producto">
            {[
              { id: "3d" as const, label: "Vista 3D", icon: <Box size={14} /> },
              { id: "photo" as const, label: "Foto", icon: <ImageIcon size={14} /> },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={tab === t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-2 rounded-full border px-4 py-2 font-mono text-[10px] uppercase tracking-[0.2em] transition ${tab === t.id ? "border-blood bg-blood text-white" : "border-bone/15 hover:border-bone/40"}`}
              >
                {t.icon} {t.label}
              </button>
            ))}
          </div>
          {(model.author || model.license) && (
            <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-steel">
              Modelo: {model.author ?? "autor no indicado"}
              {model.license ? ` · ${model.license}` : ""}
              {model.sourceUrl && (
                <>
                  {" · "}
                  <a href={model.sourceUrl} target="_blank" rel="noreferrer noopener" className="underline hover:text-bone">origen</a>
                </>
              )}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
