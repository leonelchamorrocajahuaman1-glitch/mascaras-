"use client";

import { useEffect, useRef } from "react";
import { gsap } from "@/lib/gsap";

/** Cursor personalizado: punto + anillo con inercia. Se oculta en pantallas táctiles. */
export function Cursor() {
  const dot = useRef<HTMLDivElement>(null);
  const ring = useRef<HTMLDivElement>(null);
  const label = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (window.matchMedia("(hover: none), (pointer: coarse)").matches) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    document.documentElement.classList.add("has-cursor");
    const xDot = gsap.quickTo(dot.current, "x", { duration: 0.08, ease: "power2.out" });
    const yDot = gsap.quickTo(dot.current, "y", { duration: 0.08, ease: "power2.out" });
    const xRing = gsap.quickTo(ring.current, "x", { duration: reduce ? 0.01 : 0.45, ease: "power3.out" });
    const yRing = gsap.quickTo(ring.current, "y", { duration: reduce ? 0.01 : 0.45, ease: "power3.out" });

    let shown = false;
    const move = (e: PointerEvent) => {
      if (!shown) {
        shown = true;
        gsap.set([dot.current, ring.current], { x: e.clientX, y: e.clientY });
        gsap.to([dot.current, ring.current], { opacity: 1, duration: 0.3 });
      }
      xDot(e.clientX);
      yDot(e.clientY);
      xRing(e.clientX);
      yRing(e.clientY);
    };
    const over = (e: PointerEvent) => {
      const target = (e.target as HTMLElement).closest<HTMLElement>("a, button, [data-cursor], input, select, textarea, label");
      const text = target?.dataset.cursor;
      gsap.to(ring.current, { scale: target ? (text ? 2.6 : 1.7) : 1, duration: 0.4, ease: "power3.out" });
      gsap.to(dot.current, { scale: target ? 0 : 1, duration: 0.25 });
      if (label.current) {
        label.current.textContent = text ?? "";
        gsap.to(label.current, { opacity: text ? 1 : 0, duration: 0.2 });
      }
    };
    const leave = () => gsap.to([dot.current, ring.current], { opacity: 0, duration: 0.3 });
    const enter = () => gsap.to([dot.current, ring.current], { opacity: 1, duration: 0.3 });

    window.addEventListener("pointermove", move);
    window.addEventListener("pointerover", over);
    document.addEventListener("pointerleave", leave);
    document.addEventListener("pointerenter", enter);
    return () => {
      document.documentElement.classList.remove("has-cursor");
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerover", over);
      document.removeEventListener("pointerleave", leave);
      document.removeEventListener("pointerenter", enter);
    };
  }, []);

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-[90] hidden [.has-cursor_&]:block">
      <div ref={dot} style={{ opacity: 0 }} className="absolute left-0 top-0 -ml-[3px] -mt-[3px] h-1.5 w-1.5 rounded-full bg-ember" />
      <div
        ref={ring}
        style={{ opacity: 0 }}
        className="absolute left-0 top-0 -ml-5 -mt-5 flex h-10 w-10 items-center justify-center rounded-full border border-bone/40 mix-blend-difference"
      >
        <span ref={label} className="font-mono text-[4px] uppercase tracking-[0.2em] text-bone opacity-0" />
      </div>
    </div>
  );
}
