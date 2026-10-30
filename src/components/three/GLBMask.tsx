"use client";

import { Component, useEffect, useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import { Box3, Color, Group, MathUtils, Mesh, MeshStandardMaterial, Vector3, type Object3D } from "three";
import type { MaskLook, MaskChannel } from "@/lib/masks";

/** Decodificador Draco servido desde /public/draco (funciona sin conexión a CDNs). */
export const DRACO_PATH = "/draco/";

/** Centra el modelo en el origen y lo escala para que su lado mayor mida `size` unidades. */
function normalize(root: Object3D, size: number) {
  const box = new Box3().setFromObject(root);
  const dims = box.getSize(new Vector3());
  const center = box.getCenter(new Vector3());
  const scale = size / Math.max(dims.x, dims.y, dims.z || 1e-6);
  root.scale.setScalar(scale);
  root.position.copy(center.multiplyScalar(-scale));
}

/**
 * Carga un modelo real GLB/GLTF desde /public/models.
 * Para poder recolorearlo, sus materiales (o mallas) deben llamarse "base", "web" o "lens".
 */
export function GLBMask({
  url,
  look,
  channels = [],
  rotationY = 0,
  rotationX = 0,
  size = 2,
}: {
  url: string;
  look?: MaskLook;
  channels?: MaskChannel[];
  rotationY?: number;
  rotationX?: number;
  size?: number;
}) {
  const { scene } = useGLTF(url, DRACO_PATH);

  const model = useMemo(() => {
    const clone = scene.clone(true);
    clone.rotation.set(MathUtils.degToRad(rotationX), MathUtils.degToRad(rotationY), 0);
    clone.updateMatrixWorld(true);
    clone.traverse((o) => {
      if (o instanceof Mesh) {
        o.castShadow = true;
        o.receiveShadow = true;
        if (o.material instanceof MeshStandardMaterial) o.material = o.material.clone();
      }
    });
    // Envoltorio para centrar/escalar respetando la rotación aplicada.
    const holder = new Group();
    holder.add(clone);
    normalize(holder, size);
    return holder;
  }, [scene, rotationX, rotationY, size]);

  useEffect(() => {
    if (!look || !channels.length) return;
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

/** Captura errores de carga (404, archivo corrupto…) para que no rompan el resto del lienzo. */
export class ModelErrorBoundary extends Component<
  { children: React.ReactNode; fallback?: React.ReactNode; onError?: (message: string) => void; resetKey?: string },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: Error) {
    this.props.onError?.(error.message || "No se pudo cargar el modelo.");
  }
  componentDidUpdate(prev: { resetKey?: string }) {
    if (prev.resetKey !== this.props.resetKey && this.state.failed) this.setState({ failed: false });
  }
  render() {
    return this.state.failed ? (this.props.fallback ?? null) : this.props.children;
  }
}
