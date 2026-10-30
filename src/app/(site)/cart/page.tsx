"use client";

import { ArrowUpRight } from "lucide-react";
import { useCart } from "@/lib/store/cart";
import { useHydrated } from "@/lib/hooks/useMedia";
import { CartLines, CartSummary } from "@/components/shop/CartDrawer";
import { useCartSync } from "@/components/shop/useCartSync";
import { TLink } from "@/components/experience/RouteTransition";

export default function CartPage() {
  const lines = useCart((s) => s.lines);
  const clear = useCart((s) => s.clear);
  const hydrated = useHydrated();
  const { changed } = useCartSync();

  return (
    <div className="min-h-screen px-[var(--gutter)] pb-32 pt-32">
      <h1 className="font-display text-[clamp(80px,13vw,240px)] font-black uppercase leading-[0.8]">
        Your <span className="text-outline">cart</span>
      </h1>
      {changed && (
        <p role="status" className="mt-6 max-w-xl rounded-2xl border border-blood/40 bg-blood/10 px-5 py-3 text-sm">
          Hemos actualizado tu carrito: algunos precios o existencias cambiaron desde que añadiste los productos.
        </p>
      )}
      {!hydrated ? null : lines.length === 0 ? (
        <div className="mt-16 flex flex-col items-start gap-6">
          <p className="text-bone/70">Tu carrito está vacío.</p>
          <TLink href="/shop" className="flex items-center gap-3 rounded-full bg-blood px-8 py-4 font-mono text-[11px] uppercase tracking-[0.3em] text-white">
            Ir a la tienda <ArrowUpRight size={15} />
          </TLink>
        </div>
      ) : (
        <div className="mt-14 grid gap-12 lg:grid-cols-[1.6fr_1fr]">
          <div>
            <CartLines />
            <button type="button" onClick={clear} className="mt-4 font-mono text-[11px] uppercase tracking-[0.2em] text-steel hover:text-blood">
              Vaciar carrito
            </button>
          </div>
          <aside className="h-fit space-y-6 border border-bone/10 p-6 lg:sticky lg:top-28">
            <p className="font-display text-3xl font-black uppercase">Resumen</p>
            <CartSummary />
            <TLink href="/checkout" className="flex items-center justify-center gap-3 rounded-full bg-blood py-4 font-mono text-[11px] uppercase tracking-[0.3em] text-white hover:bg-ember">
              Continuar al checkout <ArrowUpRight size={15} />
            </TLink>
            <p className="text-xs text-steel">Modo demostración: el pedido se registrará sin realizar ningún cobro.</p>
          </aside>
        </div>
      )}
    </div>
  );
}
