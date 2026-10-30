"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { AdditiveBlending, BufferAttribute, BufferGeometry, ShaderMaterial } from "three";

/** Partículas de polvo iluminado: un solo draw call, animadas en GPU. */
export function Particles({ count = 700, spread = [9, 6, 6], color = "#ff2a3a" }: { count?: number; spread?: [number, number, number]; color?: string }) {
  const mat = useRef<ShaderMaterial>(null);
  const geometry = useMemo(() => {
    const g = new BufferGeometry();
    const pos = new Float32Array(count * 3);
    const seed = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * spread[0];
      pos[i * 3 + 1] = (Math.random() - 0.5) * spread[1];
      pos[i * 3 + 2] = (Math.random() - 0.5) * spread[2] - 1;
      seed[i] = Math.random();
    }
    g.setAttribute("position", new BufferAttribute(pos, 3));
    g.setAttribute("aSeed", new BufferAttribute(seed, 1));
    return g;
  }, [count, spread]);

  const uniforms = useMemo(
    () => ({ uTime: { value: 0 }, uHeight: { value: spread[1] }, uColor: { value: [0, 0, 0] }, uPixel: { value: 1 } }),
    [spread],
  );
  useMemo(() => {
    const c = parseInt(color.slice(1), 16);
    uniforms.uColor.value = [((c >> 16) & 255) / 255, ((c >> 8) & 255) / 255, (c & 255) / 255];
  }, [color, uniforms]);

  useFrame((state) => {
    uniforms.uTime.value = state.clock.elapsedTime;
    uniforms.uPixel.value = state.viewport.dpr;
  });

  return (
    <points geometry={geometry} frustumCulled={false}>
      <shaderMaterial
        ref={mat}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={AdditiveBlending}
        vertexShader={
          /* glsl */ `
          attribute float aSeed;
          uniform float uTime; uniform float uHeight; uniform float uPixel;
          varying float vSeed; varying float vFade;
          void main() {
            vec3 p = position;
            p.y = mod(p.y + uTime * (0.04 + aSeed * 0.09) + uHeight * 0.5, uHeight) - uHeight * 0.5;
            p.x += sin(uTime * 0.3 + aSeed * 40.0) * 0.15;
            vec4 mv = modelViewMatrix * vec4(p, 1.0);
            gl_Position = projectionMatrix * mv;
            gl_PointSize = (1.0 + aSeed * 3.2) * uPixel * (5.0 / -mv.z);
            vSeed = aSeed;
            vFade = smoothstep(uHeight * 0.5, uHeight * 0.3, abs(p.y));
          }`
        }
        fragmentShader={
          /* glsl */ `
          uniform vec3 uColor; uniform float uTime;
          varying float vSeed; varying float vFade;
          void main() {
            float d = length(gl_PointCoord - 0.5);
            float a = smoothstep(0.5, 0.0, d);
            float tw = 0.55 + 0.45 * sin(uTime * (1.0 + vSeed * 2.0) + vSeed * 50.0);
            vec3 col = mix(uColor, vec3(1.0), step(0.82, vSeed));
            gl_FragColor = vec4(col, a * tw * vFade * 0.75);
          }`
        }
      />
    </points>
  );
}
