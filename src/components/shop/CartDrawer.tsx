"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import { X, Trash2 } from "lucide-react";
import { gsap } from "@/lib/gsap";
import { useExperience } from "@/lib/store/experience";
import { cartTotals, useCart, type CartLine } from "@/lib/store/cart";
import { formatMoney } from "@/lib/format";
import { siteConfig } from "@/lib/config";
import { useHydrated } from "@/lib/hooks/useMedia";
import { MASK_BY_KEY } from "@/lib/masks";
import type { MaskKey } from "@/lib/types";
import { getLenis } from "../experience/SmoothScroll";
import { TLink } from "../experience/RouteTransition";
import { MaskArt } from "../three/MaskArt";
import { QuantityStepper } from "./QuantityStepper";

export function LineThumb({ line }: { line: Pick<CartLine, "image" | "slug" | "name"> }) {
  if (line.image) {
    const external = line.image.startsWith("http") || line.image.startsWith("/api/");
    return <Image src={line.image} alt={line.name} fill sizes="96px" className="object-cover" unoptimized={external} />;
  }
  const look = MASK_BY_KEY[line.slug as MaskKey]?.look ?? MASK_BY_KEY["classic-red"].look;
  return <MaskArt look={look} glow={false} className="absolute inset-[12%]" />;
}

export function CartLines({ compact = false }: { compact?: boolean }) {
  const lines = useCart((s) => s.lines);
  const setQuantity = useCart((s) => s.setQuantity);
  const remove = useCart((s) => s.remove);
  return (
    <ul className="divide-y divide-bone/10">
      {lines.map((l) => (
        <li key={l.variantId} className="flex gap-4 py-5">
          <div className={`relative shrink-0 overflow-hidden bg-coal ${compact ? "h-20 w-16" : "h-28 w-24"}`}>
            <LineThumb line={l} />
          </div>
          <div className="flex min-w-0 flex-1 flex-col justify-between gap-2">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-display text-xl font-extrabold uppercase leading-none tracking-wide">{l.name}</p>
                <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.2em] text-steel">{l.variantName}</p>
              </div>
              <p className="font-mono text-sm tabular-nums">{formatMoney(l.unitPriceCents * l.quantity)}</p>
            </div>
            <div className="flex items-center justify-between">
              <QuantityStepper
                size="sm"
                value={l.quantity}
                max={Math.min(l.maxStock, siteConfig.maxQuantityPerItem)}
                onChange={(q) => setQuantity(l.variantId, q)}
                label={`Cantidad de ${l.name}`}
              />
              <button
                type="button"
                onClick={() => remove(l.variantId)}
                className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.2em] text-steel transition hover:text-blood"
              >
                <Trash2 size={13} /> Eliminar
              </button>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

export function CartSummary() {
  const lines = useCart((s) => s.lines);
  const { subtotal, shipping, total } = cartTotals(lines);
  return (
    <dl className="space-y-2 font-mono text-xs uppercase tracking-[0.15em]">
      <div className="flex justify-between text-steel">
        <dt>Subtotal</dt>
        <dd className="tabular-nums text-bone">{formatMoney(subtotal)}</dd>
      </div>
      <div className="flex justify-between text-steel">
        <dt>Envío</dt>
        <dd className="tabular-nums text-bone">{shipping === 0 && subtotal > 0 ? "Gratis" : formatMoney(shipping)}</dd>
      </div>
      {subtotal > 0 && subtotal < siteConfig.freeShippingFromCents && (
        <p className="pt-1 text-[10px] normal-case tracking-normal text-steel">
          Envío gratis a partir de {formatMoney(siteConfig.freeShippingFromCents)}.
        </p>
      )}
      <div className="flex justify-between border-t border-bone/10 pt-3 text-sm text-bone">
        <dt>Total</dt>
        <dd className="tabular-nums">{formatMoney(total)}</dd>
      </div>
    </dl>
  );
}

export function CartDrawer() {
  const open = useExperience((s) => s.cartOpen);
  const setOpen = useExperience((s) => s.setCartOpen);
  const lines = useCart((s) => s.lines);
  const hydrated = useHydrated();
  const panel = useRef<HTMLDivElement>(null);
  const backdrop = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (panel.current) gsap.set(panel.current, { xPercent: 100 });
  }, []);

  useEffect(() => {
    if (!panel.current || !backdrop.current) return;
    if (open) {
      getLenis()?.stop();
      gsap.set([panel.current, backdrop.current], { visibility: "visible" });
      gsap.to(backdrop.current, { opacity: 1, duration: 0.4 });
      gsap.fromTo(panel.current, { xPercent: 100 }, { xPercent: 0, duration: 0.8, ease: "expo.out" });
      window.setTimeout(() => panel.current?.querySelector<HTMLElement>("button")?.focus(), 100);
    } else {
      getLenis()?.start();
      gsap.to(backdrop.current, { opacity: 0, duration: 0.3 });
      gsap.to(panel.current, {
        xPercent: 100,
        duration: 0.5,
        ease: "expo.in",
        onComplete: () => {
          gsap.set([panel.current, backdrop.current], { visibility: "hidden" });
        },
      });
    }
  }, [open]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setOpen]);

  return (
    <>
      <div ref={backdrop} className="invisible fixed inset-0 z-[70] bg-black/70 opacity-0 backdrop-blur-sm" onClick={() => setOpen(false)} />
      <aside
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label="Carrito"
        inert={!open}
        className="invisible fixed bottom-0 right-0 top-0 z-[71] flex w-full max-w-md flex-col border-l border-bone/10 bg-ink"
        data-lenis-prevent
      >
        <div className="flex items-center justify-between border-b border-bone/10 px-6 py-5">
          <p className="font-display text-3xl font-black uppercase">Cart</p>
          <button type="button" onClick={() => setOpen(false)} className="rounded-full border border-bone/15 p-2 hover:border-blood" aria-label="Cerrar carrito">
            <X size={16} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6">
          {hydrated && lines.length ? (
            <CartLines compact />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
              <p className="font-display text-4xl font-black uppercase text-graphite">Vacío</p>
              <p className="max-w-[16rem] text-sm text-steel">Tu carrito está vacío. Cada héroe empieza eligiendo su máscara.</p>
              <TLink href="/shop" onClick={() => setOpen(false)} className="mt-2 rounded-full bg-blood px-6 py-3 font-mono text-[11px] uppercase tracking-[0.25em] text-white">
                Ir a la tienda
              </TLink>
            </div>
          )}
        </div>
        {hydrated && lines.length > 0 && (
          <div className="space-y-4 border-t border-bone/10 px-6 py-6">
            <CartSummary />
            <div className="grid grid-cols-2 gap-3">
              <TLink href="/cart" onClick={() => setOpen(false)} className="rounded-full border border-bone/20 py-3 text-center font-mono text-[11px] uppercase tracking-[0.25em] hover:border-bone">
                Ver carrito
              </TLink>
              <TLink href="/checkout" onClick={() => setOpen(false)} className="rounded-full bg-blood py-3 text-center font-mono text-[11px] uppercase tracking-[0.25em] text-white hover:bg-ember">
                Checkout
              </TLink>
            </div>
            <p className="text-center text-[11px] text-steel">Tienda de demostración: no se realizan cobros.</p>
          </div>
        )}
      </aside>
    </>
  );
}
