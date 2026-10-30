"use client";

import { useEffect, useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import { Box3, Color, Mesh, MeshStandardMaterial, Vector3 } from "three";
import type { MaskLook, MaskChannel } from "@/lib/masks";

/**
 * Carga un modelo real GLB/GLTF desde /public/models.
 * Convención de nombres de material para poder recolorear: "base", "web", "lens" (o mallas con esos nombres).
 */
export function GLBMask({ url, look, channels }: { url: string; look: MaskLook; channels: MaskChannel[] }) {
  const { scene } = useGLTF(url);
  const model = useMemo(() => {
    const clone = scene.clone(true);
    const box = new Box3().setFromObject(clone);
    const size = box.getSize(new Vector3());
    const center = box.getCenter(new Vector3());
    const scale = 2 / Math.max(size.x, size.y, size.z || 1);
    clone.position.sub(center.multiplyScalar(scale));
    clone.scale.setScalar(scale);
    clone.traverse((o) => {
      if (o instanceof Mesh && o.material instanceof MeshStandardMaterial) o.material = o.material.clone();
    });
    return clone;
  }, [scene]);

  useEffect(() => {
    if (!channels.length) return;
    model.traverse((o) => {
      if (!(o instanceof Mesh) || !(o.material instanceof MeshStandardMaterial)) return;
      const name = `${o.material.name} ${o.name}`.toLowerCase();
      if (name.includes("lens") && channels.includes("lens")) o.material.color = new Color(look.lens);
      else if (name.includes("web") && channels.includes("web")) o.material.color = new Color(look.web);
      else if (name.includes("base") && channels.includes("base")) o.material.color = new Color(look.base);
    });
  }, [model, look, channels]);

  return <primitive object={model} />;
}
