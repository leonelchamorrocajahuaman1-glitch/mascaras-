"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { ArrowDownRight } from "lucide-react";
import { gsap, ScrollTrigger, useGSAP } from "@/lib/gsap";
import { useExperience } from "@/lib/store/experience";
import { useGpuTier } from "@/lib/hooks/useMedia";
import { MASK_BY_KEY } from "@/lib/masks";
import { SplitText } from "../experience/SplitText";
import { Magnetic } from "../experience/Magnetic";
import { scrollToTarget } from "../experience/SmoothScroll";
import { TLink } from "../experience/RouteTransition";
import { MaskArt } from "../three/MaskArt";
import type { HeroDrive } from "../three/HeroScene";

const SceneCanvas = dynamic(() => import("../three/SceneCanvas").then((m) => m.SceneCanvas), { ssr: false });
const HeroScene = dynamic(() => import("../three/HeroScene").then((m) => m.HeroScene), { ssr: false });

const MANIFESTO = "Cada héroe necesita un rostro. Cada rostro esconde una historia. Nosotros fabricamos lo que hay delante.";

export function Hero() {
  const root = useRef<HTMLElement>(null);
  const drive = useRef<HeroDrive>({ reveal: 0, lensPower: 0, blink: 0, scroll: 0, intro: 0, pointerX: 0, pointerY: 0 });
  const introDone = useExperience((s) => s.introDone);
  const tier = useGpuTier();
  const [coords, setCoords] = useState({ x: 0, y: 0 });

  // Cursor → mirada de la máscara y parallax de capas.
  useEffect(() => {
    const el = root.current!;
    const layers = gsap.utils.toArray<HTMLElement>("[data-depth]", el);
    const setters = layers.map((l) => ({
      x: gsap.quickTo(l, "x", { duration: 1.2, ease: "power3.out" }),
      y: gsap.quickTo(l, "y", { duration: 1.2, ease: "power3.out" }),
      depth: Number(l.dataset.depth),
    }));
    let raf = 0;
    const move = (e: PointerEvent) => {
      const nx = (e.clientX / window.innerWidth) * 2 - 1;
      const ny = (e.clientY / window.innerHeight) * 2 - 1;
      drive.current.pointerX = nx;
      drive.current.pointerY = ny;
      setters.forEach((s) => {
        s.x(-nx * s.depth * 30);
        s.y(-ny * s.depth * 20);
      });
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => setCoords({ x: nx, y: -ny }));
    };
    if (window.matchMedia("(hover: hover) and (prefers-reduced-motion: no-preference)").matches) {
      window.addEventListener("pointermove", move);
    }
    return () => {
      window.removeEventListener("pointermove", move);
      cancelAnimationFrame(raf);
    };
  }, []);

  // Secuencia de entrada cinematográfica.
  useGSAP(
    () => {
      if (!introDone) return;
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const d = drive.current;
      if (reduce) {
        Object.assign(d, { reveal: 1, lensPower: 1, intro: 1 });
        gsap.set(".hero-in, .split-unit", { opacity: 1, yPercent: 0, y: 0 });
        return;
      }
      const tl = gsap.timeline({ defaults: { ease: "expo.out" } });
      tl.to(d, { intro: 1, duration: 2.6, ease: "power3.out" }, 0)
        .to(d, { reveal: 1, duration: 3.2, ease: "power2.inOut" }, 0.2)
        .to(d, { lensPower: 0.6, duration: 0.08, ease: "none" }, 1.1)
        .to(d, { lensPower: 0.1, duration: 0.08, ease: "none" }, 1.2)
        .to(d, { lensPower: 1, duration: 0.6, ease: "power2.out" }, 1.35)
        .fromTo(".hero-title .split-unit", { yPercent: 115 }, { yPercent: 0, duration: 1.6, stagger: 0.045 }, 0.15)
        .fromTo(".hero-in", { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 1.2, stagger: 0.08 }, 0.9)
        .fromTo(".hero-line", { scaleX: 0 }, { scaleX: 1, duration: 1.4, ease: "expo.inOut", stagger: 0.1 }, 0.6);

      // Parpadeo mecánico de las lentes cada pocos segundos.
      let id = 0;
      const blink = () => {
        gsap.timeline().to(d, { blink: 0.9, duration: 0.09, ease: "power2.in" }).to(d, { blink: 0, duration: 0.25, ease: "power2.out" });
        id = window.setTimeout(blink, 4200 + Math.random() * 3800);
      };
      id = window.setTimeout(blink, 4200);
      return () => window.clearTimeout(id);
    },
    { scope: root, dependencies: [introDone] },
  );

  // Coreografía con el scroll: la máscara gira, el título se abre y aparece el manifiesto.
  useGSAP(
    () => {
      const d = drive.current;
      const st = ScrollTrigger.create({
        trigger: root.current,
        start: "top top",
        end: "bottom bottom",
        scrub: true,
        onUpdate: (self) => (d.scroll = self.progress),
      });
      const tl = gsap.timeline({
        scrollTrigger: { trigger: root.current, start: "top top", end: "bottom bottom", scrub: 0.6 },
      });
      tl.to(".hero-row-a", { xPercent: -18, opacity: 0.08, ease: "none" }, 0)
        .to(".hero-row-b", { xPercent: 18, opacity: 0.08, ease: "none" }, 0)
        .to(".hero-ui", { opacity: 0, y: -30, ease: "none", duration: 0.3 }, 0)
        .fromTo(".manifesto", { opacity: 0 }, { opacity: 1, duration: 0.1 }, 0.35)
        .fromTo(".manifesto .split-unit", { opacity: 0.12 }, { opacity: 1, stagger: 0.02, duration: 0.2, ease: "none" }, 0.4)
        .to(".hero-glow", { scale: 1.4, opacity: 0.5, ease: "none" }, 0);
      return () => st.kill();
    },
    { scope: root },
  );

  const look = MASK_BY_KEY["classic-red"].look;

  return (
    <section ref={root} id="hero" aria-label="Spider Masks" className="relative h-[260svh]">
      <div className="sticky top-0 h-[100svh] overflow-hidden">
        {/* Fondo: resplandor rojo, retícula y anillo HUD */}
        <div aria-hidden className="absolute inset-0">
          <div
            className="hero-glow absolute left-1/2 top-1/2 h-[120vmin] w-[120vmin] -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{ background: "radial-gradient(closest-side, rgba(225,18,31,0.42), rgba(120,5,12,0.18) 45%, transparent 75%)" }}
          />
          <div
            className="absolute inset-0 opacity-[0.07]"
            style={{
              backgroundImage: "linear-gradient(rgba(243,243,241,1) 1px, transparent 1px), linear-gradient(90deg, rgba(243,243,241,1) 1px, transparent 1px)",
              backgroundSize: "80px 80px",
              maskImage: "radial-gradient(circle at 50% 50%, black, transparent 70%)",
            }}
          />
          <svg data-depth="0.4" viewBox="0 0 400 400" className="absolute left-1/2 top-1/2 h-[86vmin] w-[86vmin] -translate-x-1/2 -translate-y-1/2 opacity-40">
            <circle cx="200" cy="200" r="198" fill="none" stroke="rgba(243,243,241,0.18)" strokeWidth="0.6" />
            <circle cx="200" cy="200" r="170" fill="none" stroke="rgba(225,18,31,0.5)" strokeWidth="0.6" strokeDasharray="2 10" className="origin-center motion-safe:animate-[spin_60s_linear_infinite]" />
            {Array.from({ length: 72 }).map((_, i) => (
              <line key={i} x1="200" y1="4" x2="200" y2={i % 6 ? 10 : 18} stroke="rgba(243,243,241,0.35)" strokeWidth="0.6" transform={`rotate(${i * 5} 200 200)`} />
            ))}
          </svg>
        </div>

        {/* Título gigante detrás de la máscara */}
        <h1 className="hero-title pointer-events-none absolute inset-0 flex select-none flex-col items-center justify-center font-display font-black uppercase leading-[0.78] tracking-[-0.01em]">
          <span data-depth="0.8" className="hero-row-a block text-[clamp(96px,25vw,440px)] text-bone">
            <SplitText text="SPIDER" />
          </span>
          <span data-depth="1.2" className="hero-row-b block text-[clamp(96px,25vw,440px)] text-outline">
            <SplitText text="MASKS" />
          </span>
        </h1>

        {/* Máscara 3D */}
        <SceneCanvas
          className="absolute inset-0"
          camera={{ position: [0, 0, 4.7], fov: 30 }}
          dpr={tier === "high" ? [1, 1.75] : [1, 1.25]}
          fallback={
            <div className="flex h-full items-center justify-center">
              <MaskArt look={look} className="h-[62vmin] w-[62vmin]" />
            </div>
          }
        >
          <HeroScene drive={drive} detail={tier} />
        </SceneCanvas>

        {/* Interfaz superpuesta */}
        <div className="hero-ui pointer-events-none absolute inset-0 px-[var(--gutter)] pb-8 pt-24">
          <div className="hero-in absolute left-[var(--gutter)] top-1/2 hidden -translate-y-1/2 flex-col gap-3 font-mono text-[10px] uppercase tracking-[0.3em] text-steel md:flex">
            <span className="text-blood">SM—01</span>
            <span>Classic Red</span>
            <span className="hero-line block h-px w-16 origin-left bg-bone/30" />
            <span className="tabular-nums">X {coords.x.toFixed(2)}</span>
            <span className="tabular-nums">Y {coords.y.toFixed(2)}</span>
          </div>
          <div className="hero-in absolute right-[var(--gutter)] top-1/2 hidden -translate-y-1/2 flex-col items-end gap-3 font-mono text-[10px] uppercase tracking-[0.3em] text-steel md:flex">
            <span>Lens</span>
            <span className="flex items-center gap-2 text-bone">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-blood" /> Online
            </span>
            <span className="hero-line block h-px w-16 origin-right bg-bone/30" />
            <span>Web / 18 radios</span>
          </div>

          <div className="absolute inset-x-[var(--gutter)] bottom-8 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div className="max-w-md">
              <p className="hero-in font-display text-[clamp(30px,3.6vw,56px)] font-black uppercase leading-[0.9]">
                Behind the mask<span className="text-blood">.</span>
              </p>
              <p className="hero-in mt-3 max-w-sm text-sm leading-relaxed text-bone/70">
                Máscaras de colección presentadas como lo que son: piezas de culto. Estudio oscuro, luz roja, detalle absoluto.
              </p>
            </div>
            <div className="hero-in pointer-events-auto flex items-center gap-4">
              <Magnetic>
                <button
                  type="button"
                  onClick={() => scrollToTarget("#collection")}
                  data-cursor="Go"
                  className="group relative flex items-center gap-4 overflow-hidden rounded-full bg-blood py-4 pl-7 pr-4 font-mono text-[11px] uppercase tracking-[0.3em] text-white shadow-[0_0_40px_rgba(225,18,31,0.45)]"
                >
                  <span className="absolute inset-0 origin-left scale-x-0 bg-bone transition-transform duration-500 ease-[var(--ease-cine)] group-hover:scale-x-100" />
                  <span className="relative transition-colors duration-500 group-hover:text-ink">Explore collection</span>
                  <span className="relative flex h-8 w-8 items-center justify-center rounded-full bg-ink/30 transition-colors duration-500 group-hover:bg-blood">
                    <ArrowDownRight size={15} />
                  </span>
                </button>
              </Magnetic>
              <TLink href="/lab" className="hidden font-mono text-[11px] uppercase tracking-[0.3em] text-bone/70 underline-offset-8 hover:text-bone hover:underline sm:block">
                3D Lab
              </TLink>
            </div>
          </div>
          <div className="hero-in absolute bottom-8 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-2 font-mono text-[9px] uppercase tracking-[0.4em] text-steel lg:flex">
            Scroll
            <span className="relative block h-10 w-px overflow-hidden bg-bone/15">
              <span className="absolute inset-x-0 top-0 h-1/2 bg-blood motion-safe:animate-[scrollcue_1.8s_ease-in-out_infinite]" />
            </span>
          </div>
        </div>

        {/* Manifiesto que aparece al hacer scroll */}
        <div className="manifesto pointer-events-none absolute inset-0 flex items-center px-[var(--gutter)] opacity-0">
          <div className="max-w-[min(56rem,92vw)] md:max-w-[52vw]">
            <p className="mb-6 font-mono text-[11px] uppercase tracking-[0.35em] text-blood">( Manifiesto )</p>
            <p className="font-display text-[clamp(38px,5.4vw,92px)] font-black uppercase leading-[0.92]">
              <SplitText text={MANIFESTO} by="words" />
            </p>
          </div>
        </div>
      </div>
      <style>{`@keyframes scrollcue { 0% { transform: translateY(-100%) } 100% { transform: translateY(200%) } }`}</style>
    </section>
  );
}
