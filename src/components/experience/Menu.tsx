"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { gsap } from "@/lib/gsap";
import { useExperience } from "@/lib/store/experience";
import { getLenis, scrollToTarget } from "./SmoothScroll";
import { TLink, useNavigate } from "./RouteTransition";
import { LogoMark } from "./Logo";

const LINKS = [
  { href: "/", label: "Home", hint: "Behind the mask" },
  { href: "/#collection", label: "Collection", hint: "Seis máscaras" },
  { href: "/lab", label: "3D Mask Lab", hint: "Gira, acerca, personaliza" },
  { href: "/#details", label: "The Details", hint: "Lentes, red, materiales" },
  { href: "/shop", label: "Shop", hint: "Catálogo y carrito" },
];

export function Menu() {
  const open = useExperience((s) => s.menuOpen);
  const setOpen = useExperience((s) => s.setMenuOpen);
  const root = useRef<HTMLDivElement>(null);
  const tl = useRef<gsap.core.Timeline | null>(null);
  const pathname = usePathname();
  const navigate = useNavigate();

  useEffect(() => {
    const el = root.current!;
    tl.current = gsap
      .timeline({ paused: true })
      .set(el, { visibility: "visible" })
      .fromTo(el, { clipPath: "inset(0 0 100% 0)" }, { clipPath: "inset(0 0 0% 0)", duration: 0.8, ease: "expo.inOut" })
      .fromTo(el.querySelectorAll(".menu-item"), { yPercent: 110 }, { yPercent: 0, duration: 0.9, stagger: 0.06, ease: "expo.out" }, "-=0.35")
      .fromTo(el.querySelectorAll(".menu-fade"), { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.6, stagger: 0.05 }, "-=0.7");
    return () => {
      tl.current?.kill();
    };
  }, []);

  useEffect(() => {
    if (!tl.current) return;
    if (open) {
      getLenis()?.stop();
      tl.current.timeScale(1).play();
      const first = root.current?.querySelector<HTMLElement>("a");
      window.setTimeout(() => first?.focus({ preventScroll: true }), 400);
    } else {
      getLenis()?.start();
      tl.current.timeScale(1.6).reverse();
    }
  }, [open]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setOpen]);

  const go = (e: React.MouseEvent, href: string) => {
    if (!href.includes("#")) return;
    e.preventDefault();
    const hash = href.slice(href.indexOf("#"));
    setOpen(false);
    if (pathname === "/") window.setTimeout(() => scrollToTarget(hash), 500);
    else navigate?.(href);
  };

  return (
    <div
      ref={root}
      id="site-menu"
      className="invisible fixed inset-0 z-40 flex flex-col justify-between bg-ink px-[var(--gutter)] pb-8 pt-28"
      style={{ clipPath: "inset(0 0 100% 0)" }}
      aria-hidden={!open}
      inert={!open}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{ background: "radial-gradient(60% 60% at 85% 70%, rgba(225,18,31,0.25), transparent 70%)" }}
      />
      <nav aria-label="Menú" className="relative">
        <ul className="flex flex-col">
          {LINKS.map((l, i) => (
            <li key={l.href} className="border-b border-bone/10">
              <TLink
                href={l.href}
                onClick={(e) => go(e, l.href)}
                className="group flex items-baseline justify-between gap-6 overflow-hidden py-2 md:py-3"
              >
                <span className="menu-item flex items-baseline gap-4 md:gap-8">
                  <span className="font-mono text-xs text-blood">0{i + 1}</span>
                  <span className="font-display text-[clamp(44px,8.5vw,128px)] font-black uppercase leading-[0.9] tracking-tight transition-[color,transform] duration-500 group-hover:translate-x-4 group-hover:text-blood">
                    {l.label}
                  </span>
                </span>
                <span className="menu-fade hidden font-mono text-[11px] uppercase tracking-[0.3em] text-steel md:block">{l.hint}</span>
              </TLink>
            </li>
          ))}
        </ul>
      </nav>
      <div className="relative flex flex-wrap items-end justify-between gap-4 font-mono text-[11px] uppercase tracking-[0.25em] text-steel">
        <span className="menu-fade flex items-center gap-2">
          <LogoMark className="h-4 w-4 text-blood" /> Behind the mask.
        </span>
        <span className="menu-fade">Collection 01 — Demo store</span>
      </div>
    </div>
  );
}
