"use client";

import { useRef } from "react";
import { ArrowUpRight } from "lucide-react";
import { gsap, useGSAP } from "@/lib/gsap";
import { TLink } from "../experience/RouteTransition";
import { Marquee } from "../experience/Marquee";

export function ShopCta() {
  const root = useRef<HTMLElement>(null);
  useGSAP(
    () => {
      gsap.fromTo(
        ".cta-mask",
        { clipPath: "circle(8% at 50% 50%)" },
        { clipPath: "circle(75% at 50% 50%)", ease: "none", scrollTrigger: { trigger: root.current, start: "top bottom", end: "center center", scrub: true } },
      );
      gsap.fromTo(".cta-title .split-line > span", { yPercent: 110 }, { yPercent: 0, stagger: 0.1, scrollTrigger: { trigger: root.current, start: "top 60%", end: "center center", scrub: true } });
    },
    { scope: root },
  );
  return (
    <section ref={root} aria-label="Tienda" className="relative overflow-hidden py-10">
      <div className="cta-mask relative flex min-h-[90svh] flex-col items-center justify-center gap-10 bg-blood px-[var(--gutter)] text-center text-white">
        <div aria-hidden className="absolute inset-0 opacity-25" style={{ backgroundImage: "repeating-radial-gradient(circle at 50% 50%, transparent 0 38px, rgba(0,0,0,0.6) 39px 40px)" }} />
        <p className="relative font-mono text-[11px] uppercase tracking-[0.35em]">( 04 ) — Store</p>
        <h2 className="cta-title relative font-display text-[clamp(72px,13vw,240px)] font-black uppercase leading-[0.8]">
          <span className="split-line block"><span>Wear the</span></span>
          <span className="split-line block"><span className="text-ink">legend.</span></span>
        </h2>
        <TLink
          href="/shop"
          className="group relative flex items-center gap-4 rounded-full bg-ink px-9 py-5 font-mono text-[11px] uppercase tracking-[0.3em] text-white transition hover:bg-white hover:text-ink"
        >
          Entrar a la tienda <ArrowUpRight size={16} className="transition-transform duration-500 group-hover:rotate-45" />
        </TLink>
        <p className="relative max-w-sm text-sm text-white/80">Tienda de demostración: catálogo, carrito y pedidos funcionan; los pagos aún no están activados.</p>
      </div>
      <Marquee items={["Classic Red", "Black Symbiote", "Iron Edition", "Future Vision", "Stealth Edition", "Custom Series"]} className="mt-10 font-display text-[clamp(36px,5vw,72px)] font-black uppercase text-bone/90" speed={35} />
    </section>
  );
}
