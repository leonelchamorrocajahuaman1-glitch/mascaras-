"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { shippingFor, type PublicSettings } from "../public-settings";

export interface CartLine {
  productId: string;
  variantId: string;
  slug: string;
  name: string;
  variantName: string;
  image: string | null;
  unitPriceCents: number;
  quantity: number;
  /** Stock conocido en el momento de añadir (se revalida en el servidor al pagar). */
  maxStock: number;
}

interface CartState {
  lines: CartLine[];
  add: (line: Omit<CartLine, "quantity">, qty?: number) => void;
  setQuantity: (variantId: string, qty: number) => void;
  remove: (variantId: string) => void;
  clear: () => void;
  /** Sincroniza precios/stock con el catálogo actual del servidor. */
  reconcile: (fresh: Map<string, { unitPriceCents: number; stock: number; name: string; variantName: string }>) => void;
}

/** El límite por artículo configurable lo vuelve a aplicar el servidor al crear el pedido. */
const clampQty = (qty: number, max: number) => Math.max(1, Math.min(qty, max, 100));

export const useCart = create<CartState>()(
  persist(
    (set) => ({
      lines: [],
      add: (line, qty = 1) =>
        set((s) => {
          const existing = s.lines.find((l) => l.variantId === line.variantId);
          if (existing) {
            return {
              lines: s.lines.map((l) =>
                l.variantId === line.variantId ? { ...l, ...line, quantity: clampQty(l.quantity + qty, line.maxStock) } : l,
              ),
            };
          }
          return { lines: [...s.lines, { ...line, quantity: clampQty(qty, line.maxStock) }] };
        }),
      setQuantity: (variantId, qty) =>
        set((s) => ({ lines: s.lines.map((l) => (l.variantId === variantId ? { ...l, quantity: clampQty(qty, l.maxStock) } : l)) })),
      remove: (variantId) => set((s) => ({ lines: s.lines.filter((l) => l.variantId !== variantId) })),
      clear: () => set({ lines: [] }),
      reconcile: (fresh) =>
        set((s) => ({
          lines: s.lines
            .filter((l) => fresh.has(l.variantId) && fresh.get(l.variantId)!.stock > 0)
            .map((l) => {
              const f = fresh.get(l.variantId)!;
              return { ...l, ...f, maxStock: f.stock, quantity: clampQty(l.quantity, f.stock) };
            }),
        })),
    }),
    {
      name: "spider-masks-cart",
      version: 1,
      storage: createJSONStorage(() => localStorage),
    },
  ),
);

export function cartTotals(lines: CartLine[], settings?: Pick<PublicSettings, "shippingCents" | "freeShippingFromCents">) {
  const subtotal = lines.reduce((s, l) => s + l.unitPriceCents * l.quantity, 0);
  const shipping = settings ? shippingFor(subtotal, settings) : 0;
  const count = lines.reduce((s, l) => s + l.quantity, 0);
  return { subtotal, shipping, total: subtotal + shipping, count };
}
