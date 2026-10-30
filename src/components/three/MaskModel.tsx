"use client";

import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { Mesh } from "three";
import type { MaskLook } from "@/lib/masks";
import { getMaskGeometry } from "./maskGeometry";
import { createMaskMaterial, lerpLook, type MaskUniforms } from "./maskMaterial";

export interface MaskDrive {
  /** 0 → 1: la telaraña se dibuja desde el centro del rostro. */
  reveal: number;
  /** 0 → 1: encendido de las lentes. */
  lensPower: number;
  /** Entrecerrado adicional de las lentes (parpadeo). */
  blink: number;
}

export interface MaskHandle {
  mesh: Mesh | null;
  uniforms: MaskUniforms;
}

interface Props {
  look: MaskLook;
  drive?: React.RefObject<MaskDrive>;
  detail?: "high" | "low";
  /** Velocidad de transición entre looks (por segundo). */
  transition?: number;
}

export const MaskModel = forwardRef<MaskHandle, Props>(function MaskModel({ look, drive, detail = "high", transition = 3 }, ref) {
  const mesh = useRef<Mesh>(null);
  const { material, uniforms } = useMemo(() => createMaskMaterial(), []);
  const geometry = useMemo(() => getMaskGeometry(look.lensScale, detail), [look.lensScale, detail]);
  const first = useRef(true);

  useImperativeHandle(ref, () => ({ mesh: mesh.current, uniforms }), [uniforms]);

  useEffect(() => () => material.dispose(), [material]);

  useFrame((state, delta) => {
    const k = first.current ? 1 : 1 - Math.exp(-delta * transition);
    first.current = false;
    lerpLook(material, uniforms, look, k);
    uniforms.uTime.value = state.clock.elapsedTime;
    if (drive?.current) {
      uniforms.uReveal.value = drive.current.reveal;
      uniforms.uLensPower.value = drive.current.lensPower;
      uniforms.uSquint.value = Math.min(1, uniforms.uSquint.value + drive.current.blink);
    }
  });

  return <mesh ref={mesh} geometry={geometry} material={material} dispose={null} castShadow receiveShadow />;
});
