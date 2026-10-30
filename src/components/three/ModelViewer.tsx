"use client";

import { forwardRef, Suspense, useImperativeHandle, useRef, useState } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { ContactShadows, OrbitControls, useProgress } from "@react-three/drei";
import { ACESFilmicToneMapping, Spherical, SRGBColorSpace, Vector3 } from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { Minus, Plus, RotateCcw } from "lucide-react";
import { gsap } from "@/lib/gsap";
import { useWebGL } from "@/lib/hooks/useMedia";
import { GLBMask, ModelErrorBoundary } from "./GLBMask";
import { StudioLights } from "./Lights";

export interface ViewerModel {
  url: string;
  name: string;
  rotationY: number;
  rotationX: number;
}

const DIST = 5.8;
const ANGLES: { label: string; az: number; polar: number }[] = [
  { label: "Frente", az: 0, polar: 90 },
  { label: "3/4", az: -40, polar: 80 },
  { label: "Perfil", az: -90, polar: 90 },
  { label: "Detrás", az: 180, polar: 90 },
  { label: "Arriba", az: 0, polar: 25 },
];

interface Api {
  goTo: (azDeg: number, polarDeg: number) => void;
  zoom: (f: number) => void;
}

const Rig = forwardRef<Api, { autoRotate: boolean }>(function Rig({ autoRotate }, ref) {
  const controls = useRef<OrbitControlsImpl>(null);
  const { camera } = useThree();
  useImperativeHandle(ref, () => ({
    goTo(az, polar) {
      const c = controls.current;
      if (!c) return;
      const from = new Spherical().setFromVector3(camera.position.clone().sub(c.target));
      const s = { theta: from.theta, phi: from.phi, r: from.radius };
      const toTheta = (az * Math.PI) / 180;
      // Camino más corto alrededor del círculo.
      const delta = ((toTheta - from.theta + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
      gsap.to(s, {
        theta: from.theta + delta,
        phi: (polar * Math.PI) / 180,
        r: DIST,
        duration: 1,
        ease: "power3.inOut",
        onUpdate: () => {
          camera.position.copy(c.target).add(new Vector3().setFromSpherical(new Spherical(s.r, s.phi, s.theta)));
          c.update();
        },
      });
    },
    zoom(f) {
      const c = controls.current;
      if (!c) return;
      const dir = camera.position.clone().sub(c.target);
      const len = Math.min(9, Math.max(2.2, dir.length() * f));
      const to = c.target.clone().add(dir.setLength(len));
      gsap.to(camera.position, { x: to.x, y: to.y, z: to.z, duration: 0.5, ease: "power3.out", onUpdate: () => c.update() });
    },
  }));
  return (
    <OrbitControls
      ref={controls}
      makeDefault
      enablePan={false}
      enableDamping
      dampingFactor={0.08}
      minDistance={2.2}
      maxDistance={9}
      autoRotate={autoRotate}
      autoRotateSpeed={1.2}
    />
  );
});

/** Indicador de carga como HTML normal, fuera del lienzo (evita roots de React anidados). */
function LoaderOverlay() {
  const { active, progress } = useProgress();
  if (!active) return null;
  return (
    <span className="pointer-events-none absolute inset-0 flex items-center justify-center font-mono text-[10px] uppercase tracking-[0.3em] text-steel">
      Cargando modelo {progress.toFixed(0)}%
    </span>
  );
}

/** Visor 3D interactivo: girar (ratón/dedo), zoom (rueda/pellizco/botones) y ángulos predefinidos. */
export function ModelViewer({ model, className, label, fallback }: { model: ViewerModel; className?: string; label: string; fallback?: React.ReactNode }) {
  const webgl = useWebGL();
  const api = useRef<Api>(null);
  const [error, setError] = useState<string | null>(null);
  const [autoRotate, setAutoRotate] = useState(true);

  if (webgl === false) {
    return (
      <div className={`flex flex-col items-center justify-center gap-3 ${className ?? ""}`}>
        {fallback}
        <p className="text-xs text-steel">Tu navegador no admite WebGL: no se puede mostrar el modelo 3D.</p>
      </div>
    );
  }

  return (
    <div className={className ?? "relative h-full w-full"} data-lenis-prevent onPointerDown={() => setAutoRotate(false)}>
      {webgl && (
        <Canvas
          dpr={[1, 1.75]}
          camera={{ position: [0, 0.2, DIST], fov: 32 }}
          gl={{ antialias: true, alpha: true, toneMapping: ACESFilmicToneMapping, outputColorSpace: SRGBColorSpace }}
          aria-label={label}
        >
          <StudioLights />
          <ModelErrorBoundary resetKey={model.url} onError={setError}>
            <Suspense fallback={null}>
              <GLBMask url={model.url} rotationY={model.rotationY} rotationX={model.rotationX} />
            </Suspense>
          </ModelErrorBoundary>
          <ContactShadows position={[0, -1.2, 0]} opacity={0.55} scale={6} blur={2.4} far={2} frames={1} />
          <Rig ref={api} autoRotate={autoRotate} />
        </Canvas>
      )}
      <LoaderOverlay />
      <div className="pointer-events-none absolute inset-x-4 top-4 flex items-start justify-between gap-3 font-mono text-[10px] uppercase tracking-[0.25em] text-bone/70">
        <span>GLB · {model.name}</span>
        <span className="hidden sm:inline">Arrastra · rueda/pellizco</span>
      </div>
      {error && (
        <p role="alert" className="absolute inset-x-4 top-10 rounded-xl border border-blood/50 bg-ink/90 p-3 text-xs">
          No se pudo cargar {model.url}: {error}. Comprueba el archivo con <code>npm run models:check</code>.
        </p>
      )}
      <div className="absolute inset-x-4 bottom-4 flex flex-wrap items-center justify-center gap-2">
        {ANGLES.map((a) => (
          <button
            key={a.label}
            type="button"
            onClick={() => {
              setAutoRotate(false);
              api.current?.goTo(a.az, a.polar);
            }}
            className="rounded-full border border-bone/15 bg-ink/70 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.2em] backdrop-blur transition hover:border-blood"
          >
            {a.label}
          </button>
        ))}
        <button type="button" onClick={() => api.current?.zoom(0.8)} aria-label="Acercar" className="rounded-full border border-bone/15 bg-ink/70 p-1.5 backdrop-blur hover:border-blood">
          <Plus size={14} />
        </button>
        <button type="button" onClick={() => api.current?.zoom(1.25)} aria-label="Alejar" className="rounded-full border border-bone/15 bg-ink/70 p-1.5 backdrop-blur hover:border-blood">
          <Minus size={14} />
        </button>
        <button
          type="button"
          onClick={() => setAutoRotate((v) => !v)}
          aria-pressed={autoRotate}
          aria-label="Auto-rotación"
          className={`rounded-full border p-1.5 backdrop-blur ${autoRotate ? "border-blood bg-blood/20" : "border-bone/15 bg-ink/70"}`}
        >
          <RotateCcw size={14} />
        </button>
      </div>
    </div>
  );
}
