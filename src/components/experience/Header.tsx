"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { useExperience } from "@/lib/store/experience";
import { cartTotals, useCart } from "@/lib/store/cart";
import { useHydrated } from "@/lib/hooks/useMedia";
import { Logo } from "./Logo";
import { TLink } from "./RouteTransition";
import { Menu } from "./Menu";

export function Header() {
  const ref = useRef<HTMLElement>(null);
  const pathname = usePathname();
  const introDone = useExperience((s) => s.introDone);
  const menuOpen = useExperience((s) => s.menuOpen);
  const setMenuOpen = useExperience((s) => s.setMenuOpen);
  const setCartOpen = useExperience((s) => s.setCartOpen);
  const lines = useCart((s) => s.lines);
  const hydrated = useHydrated();
  const count = hydrated ? cartTotals(lines).count : 0;
  const [time, setTime] = useState("");

  useEffect(() => {
    const fmt = () => setTime(new Date().toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
    fmt();
    const id = window.setInterval(fmt, 1000);
    return () => window.clearInterval(id);
  }, []);

  // Entrada tras el preloader y ocultación al bajar.
  useEffect(() => {
    if (!introDone || !ref.current) return;
    gsap.fromTo(ref.current, { yPercent: -100, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 1.1, delay: 0.6, ease: "expo.out" });
    const st = ScrollTrigger.create({
      start: 0,
      end: "max",
      onUpdate: (self) => {
        if (useExperience.getState().menuOpen) return;
        const hide = self.direction === 1 && self.scroll() > 200;
        gsap.to(ref.current, { yPercent: hide ? -110 : 0, duration: 0.5, ease: "power3.out", overwrite: "auto" });
      },
    });
    return () => st.kill();
  }, [introDone]);

  useEffect(() => setMenuOpen(false), [pathname, setMenuOpen]);

  return (
    <>
      <header
        ref={ref}
        className="fixed inset-x-0 top-0 z-50 opacity-0"
        style={{ background: "linear-gradient(to bottom, rgba(5,5,6,0.85), rgba(5,5,6,0))" }}
      >
        <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:bg-blood focus:px-3 focus:py-2">
          Saltar al contenido
        </a>
        <div className="flex items-center justify-between gap-4 px-[var(--gutter)] py-5">
          <TLink href="/" aria-label="SPIDER MASKS — inicio" className="relative z-10">
            <Logo />
          </TLink>
          <div className="hidden items-center gap-6 font-mono text-[10px] uppercase tracking-[0.3em] text-steel lg:flex">
            <span className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-blood" /> Lens online
            </span>
            <span className="tabular-nums">{time}</span>
          </div>
          <nav aria-label="Principal" className="flex items-center gap-2 sm:gap-3">
            <TLink
              href="/shop"
              className="hidden rounded-full border border-bone/15 px-4 py-2 font-mono text-[11px] uppercase tracking-[0.2em] transition hover:border-blood hover:text-blood sm:block"
            >
              Shop
            </TLink>
            <button
              type="button"
              onClick={() => setCartOpen(true)}
              className="flex items-center gap-2 rounded-full border border-bone/15 px-4 py-2 font-mono text-[11px] uppercase tracking-[0.2em] transition hover:border-blood"
              aria-label={`Abrir carrito, ${count} artículos`}
            >
              Cart
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-blood px-1 text-[10px] text-white tabular-nums">
                {count}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-expanded={menuOpen}
              aria-controls="site-menu"
              className="group flex h-10 items-center gap-3 rounded-full bg-bone px-4 font-mono text-[11px] uppercase tracking-[0.2em] text-ink transition hover:bg-blood hover:text-white"
            >
              <span className="hidden sm:inline">{menuOpen ? "Close" : "Menu"}</span>
              <span className="relative block h-2.5 w-5" aria-hidden>
                <span className={`absolute left-0 h-px w-5 bg-current transition duration-500 ${menuOpen ? "top-1/2 rotate-45" : "top-0"}`} />
                <span className={`absolute left-0 h-px w-5 bg-current transition duration-500 ${menuOpen ? "top-1/2 -rotate-45" : "top-full"}`} />
              </span>
            </button>
          </nav>
        </div>
      </header>
      <Menu />
    </>
  );
}
