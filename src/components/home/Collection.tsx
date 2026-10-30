"use client";

import { useRef } from "react";
import { ArrowUpRight, Box } from "lucide-react";
import { gsap, ScrollTrigger, useGSAP } from "@/lib/gsap";
import { formatMoney, pad } from "@/lib/format";
import { TLink } from "../experience/RouteTransition";
import { ProductImage } from "../shop/ProductImage";
import type { ShowcaseItem } from "./types";

function Panel({ item, index, total }: { item: ShowcaseItem; index: number; total: number }) {
  return (
    <article
      className="coll-panel relative flex min-h-[100svh] w-full shrink-0 flex-col justify-center gap-10 px-[var(--gutter)] py-24 lg:w-[86vw] lg:flex-row lg:items-center lg:gap-[4vw] lg:py-0"
      aria-labelledby={`coll-${item.slug}`}
    >
      <div className="relative z-10 flex flex-col lg:w-[44%]">
        <div className="coll-fade mb-6 flex items-center gap-4 font-mono text-[11px] uppercase tracking-[0.3em] text-steel">
          <span style={{ color: item.accent === "#ffffff" || item.accent === "#f2f2f2" ? "#e1121f" : item.accent }}>{item.code}</span>
          <span className="h-px w-10 bg-bone/20" />
          <span>
            {pad(index + 1)} / {pad(total)}
          </span>
        </div>
        <h3 id={`coll-${item.slug}`} className="font-display text-[clamp(64px,8.4vw,150px)] font-black uppercase leading-[0.82] tracking-tight">
          {item.name.split(" ").map((w, i) => (
            <span key={i} className="split-line block">
              <span className={`coll-word ${i === 1 ? "text-outline" : ""}`}>{w}</span>
            </span>
          ))}
        </h3>
        <p className="coll-fade mt-6 font-display text-2xl font-bold uppercase tracking-wide text-blood">{item.tagline}</p>
        <p className="coll-fade mt-3 max-w-md text-[15px] leading-relaxed text-bone/70">{item.description}</p>
        <div className="coll-fade mt-8 flex flex-wrap items-end gap-x-6 gap-y-2">
          <p className="font-display text-5xl font-black tabular-nums">{formatMoney(item.priceCents)}</p>
          {item.compareAtCents && <p className="pb-1.5 font-mono text-sm text-steel line-through">{formatMoney(item.compareAtCents)}</p>}
          <p className="pb-2 font-mono text-[10px] uppercase tracking-[0.25em] text-steel">Precio demostrativo</p>
        </div>
        <div className="coll-fade mt-8 flex flex-wrap items-center gap-4">
          <TLink
            href={`/shop/${item.slug}`}
            data-cursor="View"
            className="group relative flex items-center gap-3 overflow-hidden rounded-full border border-bone/30 px-7 py-4 font-mono text-[11px] uppercase tracking-[0.3em] transition-colors duration-500 hover:border-blood"
          >
            <span className="absolute inset-0 translate-y-full bg-blood transition-transform duration-500 ease-[var(--ease-cine)] group-hover:translate-y-0" />
            <span className="relative">View details</span>
            <ArrowUpRight size={15} className="relative transition-transform duration-500 group-hover:rotate-45" />
          </TLink>
          <TLink href={`/lab?model=${item.modelKey}`} className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.3em] text-bone/60 transition hover:text-bone">
            <Box size={14} /> Ver en 3D
          </TLink>
          {!item.inStock && <span className="rounded-full bg-graphite px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-steel">Agotado</span>}
        </div>
      </div>

      <TLink
        href={`/shop/${item.slug}`}
        tabIndex={-1}
        aria-hidden
        data-cursor="View"
        className="coll-frame group relative block aspect-[4/5] w-full overflow-hidden bg-coal lg:h-[76svh] lg:w-auto lg:flex-1"
        style={{ clipPath: "inset(0 0 0 0)" }}
      >
        <div
          className="absolute inset-0 transition-opacity duration-700 group-hover:opacity-100 lg:opacity-70"
          style={{ background: `radial-gradient(70% 60% at 50% 45%, ${item.accent}33, transparent 70%)` }}
        />
        <div className="coll-img absolute inset-[-8%]">
          <ProductImage
            src={item.image}
            alt={item.name}
            maskKey={item.modelKey}
            sizes="(max-width: 1024px) 100vw, 45vw"
            className="h-full w-full transition-transform duration-[1.4s] ease-[var(--ease-out-expo)] group-hover:scale-[1.06]"
          />
        </div>
        <span className="pointer-events-none absolute inset-x-0 top-0 h-[2px] -translate-y-full bg-gradient-to-r from-transparent via-ember to-transparent opacity-0 shadow-[0_0_20px_4px_rgba(255,42,58,0.6)] group-hover:animate-[scan_1.6s_var(--ease-cine)_infinite] group-hover:opacity-100" />
        <div className="hud-corners pointer-events-none absolute inset-4 opacity-50 transition-all duration-700 group-hover:inset-6 group-hover:opacity-100" />
        <div className="absolute bottom-6 left-6 right-6 flex items-end justify-between font-mono text-[10px] uppercase tracking-[0.3em] text-bone/70">
          <span>{item.code}</span>
          <span>{item.inStock ? "Disponible" : "Agotado"}</span>
        </div>
        <span className="absolute left-6 top-5 font-display text-[clamp(80px,10vw,180px)] font-black leading-none text-outline-red opacity-70">{pad(index + 1)}</span>
      </TLink>
    </article>
  );
}

export function Collection({ items }: { items: ShowcaseItem[] }) {
  const root = useRef<HTMLElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const bar = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(
        {
          desktop: "(min-width: 1024px) and (prefers-reduced-motion: no-preference)",
          mobile: "(max-width: 1023px) and (prefers-reduced-motion: no-preference)",
        },
        (ctx) => {
          const { desktop } = ctx.conditions as { desktop: boolean };
          const panels = gsap.utils.toArray<HTMLElement>(".coll-panel");
          if (desktop && track.current) {
            const distance = () => track.current!.scrollWidth - window.innerWidth;
            const scroller = gsap.to(track.current, {
              x: () => -distance(),
              ease: "none",
              scrollTrigger: {
                trigger: root.current,
                start: "top top",
                end: () => `+=${distance()}`,
                pin: true,
                scrub: 0.8,
                invalidateOnRefresh: true,
                anticipatePin: 1,
                onUpdate: (self) => bar.current && gsap.set(bar.current, { scaleX: self.progress }),
              },
            });
            panels.forEach((panel) => {
              const st = { trigger: panel, containerAnimation: scroller, start: "left 98%", end: "left 40%", scrub: true };
              gsap.fromTo(panel.querySelectorAll(".coll-word"), { yPercent: 110 }, { yPercent: 0, stagger: 0.1, ease: "power3.out", scrollTrigger: st });
              gsap.fromTo(panel.querySelectorAll(".coll-fade"), { opacity: 0, y: 30 }, { opacity: 1, y: 0, stagger: 0.05, scrollTrigger: st });
              gsap.fromTo(panel.querySelector(".coll-frame"), { clipPath: "inset(12% 0 12% 100%)" }, { clipPath: "inset(0% 0 0% 0%)", ease: "power2.out", scrollTrigger: st });
              gsap.fromTo(
                panel.querySelector(".coll-img"),
                { xPercent: 8 },
                { xPercent: -8, ease: "none", scrollTrigger: { trigger: panel, containerAnimation: scroller, start: "left right", end: "right left", scrub: true } },
              );
            });
          } else {
            panels.forEach((panel) => {
              const st = { trigger: panel, start: "top 80%", end: "top 30%", scrub: true };
              gsap.fromTo(panel.querySelectorAll(".coll-word"), { yPercent: 110 }, { yPercent: 0, stagger: 0.1, scrollTrigger: st });
              gsap.fromTo(panel.querySelectorAll(".coll-fade"), { opacity: 0, y: 30 }, { opacity: 1, y: 0, stagger: 0.05, scrollTrigger: st });
              gsap.fromTo(panel.querySelector(".coll-frame"), { clipPath: "inset(20% 0 20% 0)" }, { clipPath: "inset(0% 0 0% 0)", scrollTrigger: st });
            });
          }
          ScrollTrigger.refresh();
        },
      );
      return () => mm.revert();
    },
    { scope: root, dependencies: [items.length] },
  );

  return (
    <section ref={root} id="collection" aria-label="Mask collection" className="relative overflow-hidden bg-ink">
      <div aria-hidden className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(40% 50% at 70% 50%, rgba(225,18,31,0.12), transparent 70%)" }} />
      <div ref={track} className="relative flex flex-col lg:h-[100svh] lg:w-max lg:flex-row">
        <header className="flex min-h-[70svh] w-full shrink-0 flex-col justify-end px-[var(--gutter)] pb-16 pt-32 lg:min-h-0 lg:w-[62vw] lg:justify-center lg:pb-0 lg:pt-0">
          <p className="mb-6 font-mono text-[11px] uppercase tracking-[0.35em] text-blood">( 01 ) — Collection</p>
          <h2 className="font-display text-[clamp(80px,12vw,220px)] font-black uppercase leading-[0.8] tracking-tight">
            Mask
            <br />
            <span className="text-outline">Collection</span>
          </h2>
          <div className="mt-10 flex max-w-xl items-start gap-6">
            <span className="font-display text-7xl font-black text-blood">{pad(items.length)}</span>
            <p className="text-[15px] leading-relaxed text-bone/70">
              Seis lecturas de un mismo icono. Desde el rojo original hasta la red que se enciende. Desliza para recorrer la colección.
            </p>
          </div>
        </header>
        {items.map((item, i) => (
          <Panel key={item.id} item={item} index={i} total={items.length} />
        ))}
        <div className="flex min-h-[60svh] w-full shrink-0 flex-col items-start justify-center gap-8 px-[var(--gutter)] lg:min-h-0 lg:w-[50vw]">
          <p className="font-display text-[clamp(56px,7vw,120px)] font-black uppercase leading-[0.85]">
            Elige
            <br />
            tu <span className="text-blood">rostro.</span>
          </p>
          <TLink href="/shop" className="group flex items-center gap-4 rounded-full bg-bone px-8 py-5 font-mono text-[11px] uppercase tracking-[0.3em] text-ink transition hover:bg-blood hover:text-white">
            Ver toda la tienda <ArrowUpRight size={16} className="transition-transform group-hover:rotate-45" />
          </TLink>
        </div>
      </div>
      <div className="absolute inset-x-[var(--gutter)] bottom-8 hidden h-px bg-bone/10 lg:block">
        <div ref={bar} className="h-full origin-left scale-x-0 bg-blood" />
      </div>
      <style>{`@keyframes scan { 0% { transform: translateY(-100%) } 100% { transform: translateY(80vh) } }`}</style>
    </section>
  );
}
