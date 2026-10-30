"use client";

import dynamic from "next/dynamic";
import type { ViewerModel } from "../three/ModelViewer";

const ModelViewer = dynamic(() => import("../three/ModelViewer").then((m) => m.ModelViewer), { ssr: false });

export function AdminModelPreview({ model }: { model: ViewerModel }) {
  return (
    <div className="relative aspect-video bg-ink">
      <ModelViewer model={model} label={`Vista previa de ${model.name}`} className="absolute inset-0" />
    </div>
  );
}
