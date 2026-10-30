"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { Camera, Eye, Lightbulb, Minus, Plus, RotateCcw, RotateCw, Sparkles, Sun, Undo2, Hand, Orbit, ShoppingBag } from "lucide-react";
import { MASKS, MASK_BY_KEY, type MaskChannel, type MaskLook } from "@/lib/masks";
import type { MaskKey } from "@/lib/types";
import { pad } from "@/lib/format";
import { useGpuTier } from "@/lib/hooks/useMedia";
import { TLink } from "../experience/RouteTransition";
import { MaskArt } from "../three/MaskArt";
import type { LabApi, LabReadout } from "../three/LabScene";
import type { MaskDrive } from "../three/MaskModel";
import type { LightRig } from "../three/Lights";

const SceneCanvas = dynamic(() => import("../three/SceneCanvas").then((m) => m.SceneCanvas), { ssr: false });
const LabScene = dynamic(() => import("../three/LabScene").then((m) => m.LabScene), { ssr: false });

export interface LabGlbModel {
  url: string;
  name: string;
  rotationY: number;
  rotationX: number;
  author?: string;
  license?: string;
  /** Producto de la tienda que usa este archivo (si lo hay). */
  shopSlug?: string;
}

const CHANNEL_LABEL: Record<MaskChannel, string> = { base: "Base", web: "Placas", lens: "Visor", glow: "Brillo de las placas" };
const CHANNEL_FIELD: Record<MaskChannel, keyof MaskLook> = { base: "base", web: "web", lens: "lens", glow: "glow" };

function Toggle({ on, onClick, icon, label }: { on: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={`flex items-center justify-between gap-3 rounded-full border px-4 py-2.5 font-mono text-[10px] uppercase tracking-[0.2em] transition ${
        on ? "border-blood/70 bg-blood/15 text-bone" : "border-bone/10 text-steel hover:border-bone/30"
      }`}
    >
      <span className="flex items-center gap-2">
        {icon} {label}
      </span>
      <span className={`h-1.5 w-1.5 rounded-full ${on ? "bg-blood shadow-[0_0_8px_#e1121f]" : "bg-graphite"}`} />
    </button>
  );
}

function ToolButton({ onClick, label, children }: { onClick: () => void; label: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="flex h-11 w-11 items-center justify-center rounded-full border border-bone/15 bg-ink/60 backdrop-blur transition hover:border-blood hover:text-blood"
    >
      {children}
    </button>
  );
}

export function MaskLab({
  initialModel = "classic-red",
  models = {},
  shopSlugs = {},
  standalone = false,
  glbModels = [],
  initialGlb,
}: {
  glbModels?: LabGlbModel[];
  initialGlb?: string;
  initialModel?: MaskKey;
  models?: Partial<Record<MaskKey, string>>;
  shopSlugs?: Partial<Record<MaskKey, string>>;
  standalone?: boolean;
}) {
  const [key, setKey] = useState<MaskKey>(MASK_BY_KEY[initialModel] ? initialModel : "classic-red");
  const [glbSel, setGlbSel] = useState<string | null>(glbModels.some((g) => g.url === initialGlb) ? initialGlb! : null);
  const [glbError, setGlbError] = useState<string | null>(null);
  const [custom, setCustom] = useState<Partial<Record<MaskKey, Partial<MaskLook>>>>({});
  const [rig, setRig] = useState<LightRig>({ key: true, rim: true, ambient: true });
  const [bloom, setBloom] = useState(true);
  const [autoRotate, setAutoRotate] = useState(false);
  const [squint, setSquint] = useState(false);
  const [active, setActive] = useState(standalone);
  const [readout, setReadout] = useState<LabReadout>({ azimuth: 0, polar: 90, distance: 5.2 });
  const api = useRef<LabApi>(null);
  const drive = useRef<MaskDrive>({ reveal: 1, lensPower: 1, blink: 0 });
  const section = useRef<HTMLElement>(null);
  const tier = useGpuTier();

  const mask = MASK_BY_KEY[key];
  const look = useMemo<MaskLook>(() => ({ ...mask.look, ...custom[key], ...(squint ? { squint: 0.75 } : {}) }), [mask, custom, key, squint]);

  useEffect(() => {
    drive.current.blink = 0;
  }, [squint]);

  // En la portada el visor se activa con un clic para no secuestrar el scroll; se desactiva al salir.
  useEffect(() => {
    if (standalone || !section.current) return;
    const io = new IntersectionObserver(([e]) => !e.isIntersecting && setActive(false), { threshold: 0.1 });
    io.observe(section.current);
    return () => io.disconnect();
  }, [standalone]);

  const setChannel = (ch: MaskChannel, color: string) =>
    setCustom((c) => ({ ...c, [key]: { ...c[key], [CHANNEL_FIELD[ch]]: color } }));

  const resetAll = useCallback(() => {
    api.current?.reset();
    setCustom((c) => ({ ...c, [key]: {} }));
    setRig({ key: true, rim: true, ambient: true });
    setBloom(true);
    setAutoRotate(false);
    setSquint(false);
  }, [key]);

  const capture = () => {
    const url = api.current?.capture();
    if (!url) return;
    const a = document.createElement("a");
    a.href = url;
    a.download = `spider-masks-${key}.png`;
    a.click();
  };

  const glb = glbModels.find((g) => g.url === glbSel) ?? null;
  const glbUrl = glb?.url ?? models[key];
  const shopSlug = glb ? glb.shopSlug : shopSlugs[key];

  return (
    <section ref={section} id="lab" aria-label="3D Mask Lab" className="relative bg-[#060607]">
      <div className="relative flex min-h-[100svh] flex-col lg:block">
        {/* Visor */}
        <div className={`relative h-[62svh] lg:absolute lg:inset-0 lg:h-auto ${active ? "" : "touch-pan-y"}`} data-lenis-prevent={active ? "" : undefined}>
          <SceneCanvas
            className="absolute inset-0"
            camera={{ position: [0, 0.1, 5.2], fov: 32 }}
            gl={{ preserveDrawingBuffer: false, antialias: true, alpha: false }}
            dpr={tier === "high" ? [1, 1.75] : [1, 1.25]}
            aria-label={`Visor 3D interactivo de la máscara ${mask.name}`}
            fallback={
              <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
                <MaskArt look={look} className="h-[40vmin] w-[40vmin]" />
                <p className="max-w-xs text-sm text-steel">Tu navegador no admite WebGL. Mostramos una ilustración 2D en lugar del visor interactivo.</p>
              </div>
            }
          >
            <LabScene
              ref={api}
              look={look}
              modelKey={glb ? glb.url : key}
              glbUrl={glbUrl}
              glbRotation={glb ? [glb.rotationX, glb.rotationY] : [0, 0]}
              onGlbError={setGlbError}
              channels={mask.customizable}
              rig={rig}
              bloom={bloom}
              autoRotate={autoRotate}
              interactive={active}
              drive={drive}
              onReadout={setReadout}
              detail={tier}
            />
          </SceneCanvas>
          {!active && (
            <button
              type="button"
              onClick={() => setActive(true)}
              className="absolute inset-0 z-10 flex items-end justify-center pb-10 lg:items-center lg:pb-0"
              aria-label="Activar el visor 3D"
              data-cursor="Drag"
            >
              <span className="flex items-center gap-3 rounded-full border border-bone/20 bg-ink/70 px-6 py-3 font-mono text-[11px] uppercase tracking-[0.3em] backdrop-blur">
                <Hand size={14} className="text-blood" /> Clic para interactuar
              </span>
            </button>
          )}
          {/* Lectura HUD */}
          <div className="pointer-events-none absolute left-1/2 top-24 hidden -translate-x-1/2 gap-6 font-mono text-[10px] uppercase tracking-[0.3em] text-steel lg:flex">
            <span className="tabular-nums">AZ {readout.azimuth.toFixed(0).padStart(4, " ")}°</span>
            <span className="tabular-nums">POL {readout.polar.toFixed(0)}°</span>
            <span className="tabular-nums">DIST {readout.distance.toFixed(2)}</span>
          </div>
        </div>

        {/* Cabecera del laboratorio */}
        <div className="pointer-events-none relative px-[var(--gutter)] pt-10 lg:absolute lg:left-0 lg:top-0 lg:pt-28">
          <p className="font-mono text-[11px] uppercase tracking-[0.35em] text-blood">( 02 ) — Interactive</p>
          <h2 className="mt-3 font-display text-[clamp(56px,7vw,120px)] font-black uppercase leading-[0.8]">
            3D Mask
            <br />
            <span className="text-outline">Lab</span>
          </h2>
          <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.25em] text-steel">
            {glbUrl ? `Modelo GLB · ${decodeURIComponent(glbUrl)}` : "Modelo procedural en tiempo real · Three.js"}
          </p>
        </div>

        {/* Selector de modelos */}
        <nav aria-label="Modelos" className="relative px-[var(--gutter)] pt-6 lg:absolute lg:bottom-28 lg:left-0 lg:w-[300px] lg:pt-0">
          <ul className="flex gap-2 overflow-x-auto pb-2 scrollbar-none lg:flex-col lg:gap-0 lg:overflow-visible">
            {MASKS.map((m, i) => (
              <li key={m.key} className="shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setGlbSel(null);
                    setKey(m.key);
                  }}
                  aria-pressed={!glb && m.key === key}
                  className={`group flex w-full items-center gap-4 rounded-full border px-4 py-2 text-left transition lg:rounded-none lg:border-0 lg:border-b lg:px-0 lg:py-3 ${
                    m.key === key ? "border-blood text-bone lg:border-bone/20" : "border-bone/10 text-steel hover:text-bone lg:border-bone/10"
                  }`}
                >
                  <span className={`font-mono text-[10px] ${m.key === key ? "text-blood" : ""}`}>{pad(i + 1)}</span>
                  <span className="whitespace-nowrap font-display text-lg font-extrabold uppercase tracking-wide lg:text-2xl">{m.name}</span>
                  <span className={`ml-auto hidden h-px bg-blood transition-all duration-500 lg:block ${m.key === key ? "w-8" : "w-0"}`} />
                </button>
              </li>
            ))}
            {glbModels.map((g, i) => (
              <li key={g.url} className="shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setGlbError(null);
                    setGlbSel(g.url);
                  }}
                  aria-pressed={glbSel === g.url}
                  className={`group flex w-full items-center gap-4 rounded-full border px-4 py-2 text-left transition lg:rounded-none lg:border-0 lg:border-b lg:px-0 lg:py-3 ${
                    glbSel === g.url ? "border-blood text-bone lg:border-bone/20" : "border-bone/10 text-steel hover:text-bone lg:border-bone/10"
                  }`}
                >
                  <span className={`font-mono text-[10px] ${glbSel === g.url ? "text-blood" : ""}`}>GLB{pad(i + 1)}</span>
                  <span className="max-w-[12rem] truncate whitespace-nowrap font-display text-lg font-extrabold uppercase tracking-wide lg:text-2xl">{g.name}</span>
                </button>
              </li>
            ))}
          </ul>
        </nav>

        {/* Panel de personalización */}
        <aside
          aria-label="Personalización"
          className="relative space-y-6 px-[var(--gutter)] py-8 lg:absolute lg:bottom-28 lg:right-[var(--gutter)] lg:top-28 lg:w-[300px] lg:overflow-y-auto lg:px-0 lg:py-0 scrollbar-none"
          data-lenis-prevent
        >
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-blood">{glb ? "Archivo GLB" : mask.code}</p>
            <p className="mt-1 font-display text-3xl font-black uppercase">{glb ? glb.name : mask.name}</p>
            <p className="mt-1 text-sm text-bone/60">
              {glb ? `${glb.author ? `Autor: ${glb.author}` : "Autor no indicado"}${glb.license ? ` · ${glb.license}` : ""}` : mask.tagline}
            </p>
            {glbError && <p role="alert" className="mt-2 text-xs text-blood">No se pudo cargar el archivo: {glbError}</p>}
          </div>

          <div>
            <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.3em] text-steel">Colores</p>
            {mask.customizable.length && !glbUrl ? (
              <div className="space-y-4">
                {mask.customizable.map((ch) => (
                  <fieldset key={ch}>
                    <legend className="mb-2 text-xs text-bone/70">{CHANNEL_LABEL[ch]}</legend>
                    <div className="flex flex-wrap items-center gap-2">
                      {(mask.swatches[ch] ?? []).map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setChannel(ch, c)}
                          aria-label={`${CHANNEL_LABEL[ch]} ${c}`}
                          aria-pressed={look[CHANNEL_FIELD[ch]] === c}
                          className={`h-8 w-8 rounded-full border-2 transition ${look[CHANNEL_FIELD[ch]] === c ? "scale-110 border-bone" : "border-bone/10 hover:border-bone/50"}`}
                          style={{ background: c }}
                        />
                      ))}
                      <label className="relative flex h-8 w-8 cursor-pointer items-center justify-center overflow-hidden rounded-full border border-dashed border-bone/30 text-steel hover:text-bone" title="Color libre">
                        <Plus size={12} />
                        <input
                          type="color"
                          value={String(look[CHANNEL_FIELD[ch]])}
                          onChange={(e) => setChannel(ch, e.target.value)}
                          className="absolute inset-0 cursor-pointer opacity-0"
                          aria-label={`Color personalizado: ${CHANNEL_LABEL[ch]}`}
                        />
                      </label>
                    </div>
                  </fieldset>
                ))}
              </div>
            ) : (
              <p className="text-xs leading-relaxed text-steel">{glb ? "Se muestran los colores y texturas originales del archivo." : "Colorway de edición fijo. Prueba Classic Red, Future Vision o Custom Series para personalizar."}</p>
            )}
          </div>

          <div>
            <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.3em] text-steel">Iluminación y efectos</p>
            <div className="grid gap-2">
              <Toggle on={rig.key} onClick={() => setRig((r) => ({ ...r, key: !r.key }))} icon={<Sun size={13} />} label="Luz principal" />
              <Toggle on={rig.rim} onClick={() => setRig((r) => ({ ...r, rim: !r.rim }))} icon={<Lightbulb size={13} />} label="Contraluz rojo" />
              <Toggle on={rig.ambient} onClick={() => setRig((r) => ({ ...r, ambient: !r.ambient }))} icon={<Sparkles size={13} />} label="Ambiente y partículas" />
              <Toggle on={bloom} onClick={() => setBloom((b) => !b)} icon={<Sparkles size={13} />} label="Bloom" />
              <Toggle on={autoRotate} onClick={() => setAutoRotate((a) => !a)} icon={<Orbit size={13} />} label="Auto-rotación" />
              <Toggle on={squint} onClick={() => setSquint((s) => !s)} icon={<Eye size={13} />} label="Lentes entrecerradas" />
            </div>
          </div>

          {shopSlug && (
            <TLink
              href={`/shop/${shopSlug}`}
              className="flex items-center justify-center gap-2 rounded-full bg-blood py-3.5 font-mono text-[11px] uppercase tracking-[0.25em] text-white transition hover:bg-ember"
            >
              <ShoppingBag size={14} /> Ver en la tienda
            </TLink>
          )}
        </aside>

        {/* Barra de herramientas */}
        <div className="relative z-20 flex flex-wrap items-center justify-center gap-2 px-[var(--gutter)] pb-10 lg:absolute lg:bottom-8 lg:left-1/2 lg:-translate-x-1/2 lg:pb-0">
          <ToolButton onClick={() => api.current?.rotate(-Math.PI / 6)} label="Girar a la izquierda">
            <RotateCcw size={16} />
          </ToolButton>
          <ToolButton onClick={() => api.current?.rotate(Math.PI / 6)} label="Girar a la derecha">
            <RotateCw size={16} />
          </ToolButton>
          <ToolButton onClick={() => api.current?.zoom(0.8)} label="Acercar">
            <Plus size={16} />
          </ToolButton>
          <ToolButton onClick={() => api.current?.zoom(1.25)} label="Alejar">
            <Minus size={16} />
          </ToolButton>
          <ToolButton onClick={capture} label="Descargar captura PNG">
            <Camera size={16} />
          </ToolButton>
          <button
            type="button"
            onClick={resetAll}
            className="flex h-11 items-center gap-2 rounded-full bg-bone px-5 font-mono text-[10px] uppercase tracking-[0.25em] text-ink transition hover:bg-blood hover:text-white"
          >
            <Undo2 size={14} /> Restablecer vista
          </button>
        </div>
      </div>
    </section>
  );
}
