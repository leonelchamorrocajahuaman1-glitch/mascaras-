"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { gsap } from "@/lib/gsap";
import { useExperience } from "@/lib/store/experience";
import { LogoMark } from "./Logo";

const STEPS = ["Calibrando lentes", "Tejiendo la red", "Encendiendo el estudio", "Behind the mask"];

/** Pantalla de carga: espera a que la escena 3D esté lista (en la portada) y abre como unos párpados. */
export function Preloader() {
  const pathname = usePathname();
  const root = useRef<HTMLDivElement>(null);
  const [count, setCount] = useState(0);
  const [step, setStep] = useState(0);
  const [gone, setGone] = useState(false);
  const sceneReady = useExperience((s) => s.sceneReady);
  const setIntroDone = useExperience((s) => s.setIntroDone);
  const needsScene = useRef(pathname === "/");
  const progress = useRef({ v: 0 });
  const finished = useRef(false);

  // Progreso "falso" suave hasta 85 %; el resto depende de la escena real.
  useEffect(() => {
    document.documentElement.style.overflow = "hidden";
    const tween = gsap.to(progress.current, {
      v: 85,
      duration: needsScene.current ? 2.2 : 0.9,
      ease: "power2.out",
      onUpdate: () => setCount(Math.round(progress.current.v)),
    });
    const fallback = window.setTimeout(() => useExperience.getState().setSceneReady(), 9000);
    return () => {
      tween.kill();
      window.clearTimeout(fallback);
    };
  }, []);

  useEffect(() => {
    setStep(Math.min(STEPS.length - 1, Math.floor((count / 100) * STEPS.length)));
  }, [count]);

  useEffect(() => {
    if (finished.current) return;
    if (needsScene.current && !sceneReady) return;
    finished.current = true;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const el = root.current!;
    const tl = gsap.timeline({
      delay: needsScene.current ? 0.3 : 0.1,
      onComplete: () => {
        document.documentElement.style.overflow = "";
        setGone(true);
      },
    });
    tl.to(progress.current, { v: 100, duration: 0.6, ease: "power2.inOut", onUpdate: () => setCount(Math.round(progress.current.v)) })
      .to(el.querySelector(".pl-content"), { opacity: 0, y: -20, duration: reduce ? 0.01 : 0.4, ease: "power2.in" })
      .to(el.querySelector(".pl-line"), { scaleX: 1, duration: reduce ? 0.01 : 0.45, ease: "power4.inOut" }, "<")
      .add(() => setIntroDone())
      .to(el.querySelector(".pl-top"), { yPercent: -100, duration: reduce ? 0.01 : 1.1, ease: "expo.inOut" })
      .to(el.querySelector(".pl-bottom"), { yPercent: 100, duration: reduce ? 0.01 : 1.1, ease: "expo.inOut" }, "<")
      .to(el.querySelector(".pl-line"), { opacity: 0, duration: 0.3 }, "<0.3");
  }, [sceneReady, setIntroDone]);

  if (gone) return null;

  return (
    <div ref={root} className="fixed inset-0 z-[100]" role="status" aria-live="polite" aria-label={`Cargando ${count}%`}>
      <div className="pl-top absolute inset-x-0 top-0 h-1/2 bg-ink" />
      <div className="pl-bottom absolute inset-x-0 bottom-0 h-1/2 bg-ink" />
      <div className="pl-line absolute inset-x-0 top-1/2 h-px origin-center scale-x-0 bg-blood shadow-[0_0_24px_4px_rgba(225,18,31,0.7)]" />
      <div className="pl-content absolute inset-0 flex flex-col justify-between p-[var(--gutter)]">
        <div className="flex items-center justify-between font-mono text-[11px] uppercase tracking-[0.3em] text-steel">
          <span className="flex items-center gap-2">
            <LogoMark className="h-4 w-4 text-blood" /> Spider Masks
          </span>
          <span>Collection 01</span>
        </div>
        <div className="flex flex-col items-center gap-6">
          <div className="relative">
            <LogoMark className="h-14 w-14 text-graphite" />
            <div className="absolute inset-0 overflow-hidden" style={{ clipPath: `inset(${100 - count}% 0 0 0)` }}>
              <LogoMark className="h-14 w-14 text-blood" />
            </div>
          </div>
          <p className="font-mono text-[11px] uppercase tracking-[0.35em] text-steel">{STEPS[step]}</p>
        </div>
        <div className="flex items-end justify-between">
          <span className="font-mono text-[11px] uppercase tracking-[0.3em] text-steel">Behind the mask.</span>
          <span className="font-display text-[clamp(64px,14vw,200px)] font-black leading-[0.8] tabular-nums">
            {String(count).padStart(3, "0")}
          </span>
        </div>
        <div className="absolute inset-x-[var(--gutter)] bottom-[calc(var(--gutter)-12px)] h-px bg-graphite">
          <div className="h-full bg-blood transition-[width] duration-150" style={{ width: `${count}%` }} />
        </div>
      </div>
    </div>
  );
}
