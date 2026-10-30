"use client";

import { Suspense, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { PerspectiveCamera, View } from "@react-three/drei";
import { ACESFilmicToneMapping, MathUtils, SRGBColorSpace, type Group, type PerspectiveCamera as Cam } from "three";
import { ArrowUpRight, Maximize2, Minus, Plus } from "lucide-react";
import { formatMoney, pad } from "@/lib/format";
import { useWebGL } from "@/lib/hooks/useMedia";
import { TLink } from "../experience/RouteTransition";
import { GLBMask, ModelErrorBoundary } from "../three/GLBMask";
import { StudioLights } from "../three/Lights";
import type { ViewerModel } from "../three/ModelViewer";

export interface GalleryItem {
  id: string;
  slug: string;
  name: string;
  code: string;
  priceCents: number;
  inStock: boolean;
  model: ViewerModel & { author?: string; license?: string };
}

interface Pose {
  rotX: number;
  rotY: number;
  zoom: number;
  idle: boolean;
}

const ANGLES = [
  { label: "Frente", y: 0, x: 0 },
  { label: "Perfil", y: -Math.PI / 2, x: 0 },
  { label: "Detrás", y: Math.PI, x: 0 },
  { label: "Arriba", y: 0, x: 0.9 },
];

function CardScene({ item, pose, onError }: { item: GalleryItem; pose: React.RefObject<Pose>; onError: (m: string) => void }) {
  const group = useRef<Group>(null);
  const cam = useRef<Cam>(null);
  useFrame((_, delta) => {
    const p = pose.current;
    if (!group.current || !cam.current || !p) return;
    if (p.idle) p.rotY += delta * 0.35;
    const k = 1 - Math.exp(-delta * 6);
    group.current.rotation.y = MathUtils.lerp(group.current.rotation.y, p.rotY, k);
    group.current.rotation.x = MathUtils.lerp(group.current.rotation.x, p.rotX, k);
    cam.current.position.z = MathUtils.lerp(cam.current.position.z, 6 / p.zoom, k);
  });
  return (
    <>
      <PerspectiveCamera ref={cam} makeDefault position={[0, 0.1, 6]} fov={30} />
      <StudioLights />
      <group ref={group}>
        <ModelErrorBoundary resetKey={item.model.url} onError={onError}>
          <Suspense fallback={null}>
            <GLBMask url={item.model.url} rotationY={item.model.rotationY} rotationX={item.model.rotationX} size={1.8} />
          </Suspense>
        </ModelErrorBoundary>
      </group>
    </>
  );
}

function Card({ item, index, webgl }: { item: GalleryItem; index: number; webgl: boolean }) {
  const pose = useRef<Pose>({ rotX: 0, rotY: 0, zoom: 1, idle: true });
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef(0);
  const [error, setError] = useState<string | null>(null);

  const onDown = (e: React.PointerEvent) => {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    pose.current.idle = false;
  };
  const onMove = (e: React.PointerEvent) => {
    const prev = pointers.current.get(e.pointerId);
    if (!prev) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (pinch.current) pose.current.zoom = MathUtils.clamp(pose.current.zoom * (d / pinch.current), 0.6, 2.4);
      pinch.current = d;
      return;
    }
    pose.current.rotY += (e.clientX - prev.x) * 0.012;
    pose.current.rotX = MathUtils.clamp(pose.current.rotX + (e.clientY - prev.y) * 0.008, -1.2, 1.2);
  };
  const onUp = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinch.current = 0;
  };
  const zoom = (f: number) => {
    pose.current.idle = false;
    pose.current.zoom = MathUtils.clamp(pose.current.zoom * f, 0.6, 2.4);
  };

  return (
    <article className="group relative flex flex-col border border-bone/10 bg-coal/40">
      <div
        className="relative aspect-square cursor-grab touch-none select-none active:cursor-grabbing"
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        onDoubleClick={() => Object.assign(pose.current, { rotX: 0, rotY: 0, zoom: 1, idle: true })}
        data-cursor="Drag"
        aria-label={`Modelo 3D de ${item.name}: arrastra para girar, pellizca o usa los botones para ampliar, doble clic para restablecer`}
        role="img"
      >
        <div className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(55% 50% at 50% 50%, rgba(225,18,31,0.22), transparent 70%)" }} />
        {webgl ? (
          <View className="absolute inset-0">
            <CardScene item={item} pose={pose} onError={setError} />
          </View>
        ) : (
          <p className="absolute inset-0 flex items-center justify-center p-6 text-center text-xs text-steel">WebGL no disponible en este navegador.</p>
        )}
        {error && <p role="alert" className="absolute inset-x-3 top-3 z-[2] rounded-lg bg-ink/90 p-2 text-[11px] text-blood">No se pudo cargar el modelo: {error}</p>}
        <span className="pointer-events-none absolute left-4 top-4 z-[2] font-mono text-[10px] uppercase tracking-[0.25em] text-bone/60">
          {pad(index + 1)} · GLB
        </span>
        <div className="absolute bottom-3 left-3 right-3 z-[2] flex flex-wrap items-center justify-center gap-1.5" onPointerDown={(e) => e.stopPropagation()}>
          {ANGLES.map((a) => (
            <button
              key={a.label}
              type="button"
              onClick={() => Object.assign(pose.current, { rotY: a.y, rotX: a.x, idle: false })}
              className="rounded-full border border-bone/15 bg-ink/70 px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.2em] backdrop-blur hover:border-blood"
            >
              {a.label}
            </button>
          ))}
          <button type="button" onClick={() => zoom(1.2)} aria-label="Acercar" className="rounded-full border border-bone/15 bg-ink/70 p-1 backdrop-blur hover:border-blood">
            <Plus size={12} />
          </button>
          <button type="button" onClick={() => zoom(1 / 1.2)} aria-label="Alejar" className="rounded-full border border-bone/15 bg-ink/70 p-1 backdrop-blur hover:border-blood">
            <Minus size={12} />
          </button>
        </div>
      </div>
      <div className="flex items-end justify-between gap-4 border-t border-bone/10 p-5">
        <div className="min-w-0">
          <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-blood">{item.code}</p>
          <p className="truncate font-display text-3xl font-black uppercase leading-none">{item.name}</p>
          <p className="mt-1 truncate font-mono text-[9px] uppercase tracking-[0.15em] text-steel">
            {item.model.author ? `Modelo: ${item.model.author}` : item.model.name}
            {item.model.license ? ` · ${item.model.license}` : ""}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          <p className="font-display text-2xl font-black tabular-nums">{formatMoney(item.priceCents)}</p>
          <TLink href={`/shop/${item.slug}`} className="flex items-center gap-1.5 rounded-full border border-bone/20 px-3 py-1.5 font-mono text-[9px] uppercase tracking-[0.2em] hover:border-blood">
            {item.inStock ? "Comprar" : "Ver"} <ArrowUpRight size={12} />
          </TLink>
        </div>
      </div>
      <TLink href={`/shop/${item.slug}`} aria-label={`Abrir visor completo de ${item.name}`} className="absolute right-3 top-3 z-[2] rounded-full border border-bone/15 bg-ink/70 p-2 backdrop-blur hover:border-blood">
        <Maximize2 size={13} />
      </TLink>
    </article>
  );
}

/** Rejilla de previsualizaciones 3D que comparten un único lienzo WebGL (drei View). */
export function ModelGallery({ items }: { items: GalleryItem[] }) {
  const container = useRef<HTMLDivElement>(null);
  const webgl = useWebGL();
  return (
    <div ref={container} className="relative">
      <div className="grid gap-4 px-[var(--gutter)] sm:grid-cols-2 xl:grid-cols-3">
        {items.map((item, i) => (
          <Card key={item.id} item={item} index={i} webgl={webgl !== false} />
        ))}
      </div>
      {webgl && (
        <Canvas
          eventSource={container as React.RefObject<HTMLElement>}
          className="!pointer-events-none !fixed !inset-0"
          style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 1 }}
          dpr={[1, 1.5]}
          gl={{ antialias: true, alpha: true, toneMapping: ACESFilmicToneMapping, outputColorSpace: SRGBColorSpace }}
        >
          <View.Port />
        </Canvas>
      )}
    </div>
  );
}
