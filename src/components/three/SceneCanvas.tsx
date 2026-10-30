"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { Canvas, type CanvasProps } from "@react-three/fiber";
import { ACESFilmicToneMapping, SRGBColorSpace } from "three";
import { useWebGL } from "@/lib/hooks/useMedia";
import { useExperience } from "@/lib/store/experience";

interface Props extends Omit<CanvasProps, "children"> {
  children: React.ReactNode;
  fallback: React.ReactNode;
  className?: string;
  /** Pausa el render cuando el lienzo no está en pantalla. */
  pauseOffscreen?: boolean;
}

/** Canvas con detección de WebGL, pausa fuera de pantalla y respaldo visual. */
export function SceneCanvas({ children, fallback, className, pauseOffscreen = true, dpr = [1, 1.75], ...rest }: Props) {
  const webgl = useWebGL();
  const wrap = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(true);
  const [failed, setFailed] = useState(false);

  // Sin WebGL no hay escena que esperar: el preloader puede abrir ya.
  useEffect(() => {
    if (webgl === false || failed) useExperience.getState().setSceneReady();
  }, [webgl, failed]);

  useEffect(() => {
    if (!pauseOffscreen || !wrap.current) return;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { rootMargin: "120px" });
    io.observe(wrap.current);
    return () => io.disconnect();
  }, [pauseOffscreen]);

  return (
    <div ref={wrap} className={className}>
      {webgl === false || failed ? (
        fallback
      ) : webgl ? (
        <Canvas
          dpr={dpr}
          frameloop={visible ? "always" : "never"}
          gl={{ antialias: true, alpha: true, powerPreference: "high-performance", toneMapping: ACESFilmicToneMapping, outputColorSpace: SRGBColorSpace }}
          onCreated={({ gl }) => {
            gl.domElement.addEventListener("webglcontextlost", () => setFailed(true), { once: true });
          }}
          {...rest}
        >
          <Suspense fallback={null}>{children}</Suspense>
        </Canvas>
      ) : null}
    </div>
  );
}
