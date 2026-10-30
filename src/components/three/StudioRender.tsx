"use client";

import { useEffect } from "react";
import { Canvas } from "@react-three/fiber";
import { MASK_BY_KEY } from "@/lib/masks";
import type { MaskKey } from "@/lib/types";
import { MaskModel } from "./MaskModel";
import { StudioLights } from "./Lights";

const SHOTS: Record<string, { pos: [number, number, number]; rot: [number, number, number]; fov: number }> = {
  front: { pos: [0, 0.05, 4.6], rot: [0, 0, 0], fov: 30 },
  three: { pos: [0, 0.05, 4.6], rot: [0.05, -0.55, 0], fov: 30 },
  product: { pos: [0, 0.02, 5.1], rot: [0.06, -0.42, 0], fov: 30 },
  eye: { pos: [0.33, 0.2, 1.35], rot: [0, -0.25, 0], fov: 22 },
  side: { pos: [0, 0.05, 4.6], rot: [0, -1.35, 0], fov: 30 },
};

export function StudioRender({ model, shot }: { model: string; shot: string }) {
  const mask = MASK_BY_KEY[model as MaskKey] ?? MASK_BY_KEY["classic-red"];
  const s = SHOTS[shot] ?? SHOTS.front;
  useEffect(() => {
    if (shot !== "product") return;
    document.documentElement.style.background = "transparent";
    document.body.style.background = "transparent";
  }, [shot]);
  return (
    <div style={{ width: "100vw", height: "100vh", background: shot === "product" ? "transparent" : "radial-gradient(circle at 50% 45%, #2a0307 0%, #050506 60%)" }}>
      <Canvas camera={{ position: s.pos, fov: s.fov }} dpr={[1, 2]} gl={{ antialias: true, preserveDrawingBuffer: true, alpha: true }}>
        <StudioLights />
        <group rotation={s.rot}>
          <MaskModel look={mask.look} />
        </group>
      </Canvas>
    </div>
  );
}
