"use client";

import { createContext, useCallback, useContext, useEffect, useRef } from "react";
import Link, { type LinkProps } from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { gsap } from "@/lib/gsap";
import { LogoMark } from "./Logo";

type Navigate = (href: string) => void;
const Ctx = createContext<Navigate | null>(null);

/** Telón cinematográfico entre páginas: cubre, navega y descubre. */
export function RouteTransitionProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const curtain = useRef<HTMLDivElement>(null);
  const busy = useRef(false);
  const pending = useRef<string | null>(null);

  const navigate = useCallback<Navigate>(
    (href) => {
      const target = new URL(href, window.location.href);
      if (target.pathname === window.location.pathname) {
        router.push(href);
        return;
      }
      if (busy.current) return;
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !curtain.current) {
        router.push(href);
        return;
      }
      busy.current = true;
      pending.current = target.pathname;
      const panels = curtain.current.querySelectorAll(".curtain-panel");
      gsap.set(curtain.current, { visibility: "visible" });
      gsap
        .timeline()
        .fromTo(panels, { scaleY: 0, transformOrigin: "50% 100%" }, { scaleY: 1, duration: 0.55, ease: "power4.inOut", stagger: 0.06 })
        .fromTo(curtain.current.querySelector(".curtain-mark"), { opacity: 0, scale: 0.8 }, { opacity: 1, scale: 1, duration: 0.3 }, "-=0.2")
        .add(() => router.push(href));
    },
    [router],
  );

  useEffect(() => {
    if (!busy.current || !curtain.current) return;
    const panels = curtain.current.querySelectorAll(".curtain-panel");
    gsap
      .timeline({ delay: 0.15 })
      .to(curtain.current.querySelector(".curtain-mark"), { opacity: 0, duration: 0.2 })
      .to(panels, { scaleY: 0, transformOrigin: "50% 0%", duration: 0.6, ease: "power4.inOut", stagger: 0.06 })
      .add(() => {
        gsap.set(curtain.current, { visibility: "hidden" });
        busy.current = false;
      });
  }, [pathname]);

  return (
    <Ctx.Provider value={navigate}>
      {children}
      <div ref={curtain} aria-hidden className="pointer-events-none invisible fixed inset-0 z-[80] flex">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className={`curtain-panel h-full flex-1 ${i % 2 ? "bg-coal" : "bg-ink"}`} style={{ transform: "scaleY(0)" }} />
        ))}
        <div className="curtain-mark absolute inset-0 flex items-center justify-center opacity-0">
          <LogoMark className="h-16 w-16 text-blood" />
        </div>
      </div>
    </Ctx.Provider>
  );
}

export function useNavigate() {
  return useContext(Ctx);
}

type TLinkProps = LinkProps & Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, keyof LinkProps> & { children: React.ReactNode };

/** Link que reproduce el telón antes de navegar (mantiene href real, accesible y compatible con abrir en pestaña nueva). */
export function TLink({ href, onClick, children, ...rest }: TLinkProps) {
  const navigate = useNavigate();
  return (
    <Link
      href={href}
      {...rest}
      onClick={(e) => {
        onClick?.(e);
        if (e.defaultPrevented || !navigate) return;
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
        const url = typeof href === "string" ? href : href.pathname ?? "/";
        if (url.startsWith("http") || url.startsWith("#")) return;
        e.preventDefault();
        navigate(url);
      }}
    >
      {children}
    </Link>
  );
}
