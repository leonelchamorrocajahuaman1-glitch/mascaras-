"use client";

import { useEffect, useState } from "react";
import { useCart } from "@/lib/store/cart";
import type { Product } from "@/lib/types";

/** Revalida precios y stock del carrito con el servidor (el carrito local puede estar desactualizado). */
export function useCartSync() {
  const [changed, setChanged] = useState(false);
  const [synced, setSynced] = useState(false);

  useEffect(() => {
    const run = async () => {
      const lines = useCart.getState().lines;
      if (!lines.length) return setSynced(true);
      const ids = [...new Set(lines.map((l) => l.productId))].join(",");
      const res = await fetch(`/api/products?ids=${encodeURIComponent(ids)}`, { cache: "no-store" }).catch(() => null);
      if (!res?.ok) return setSynced(true);
      const { products } = (await res.json()) as { products: Product[] };
      const fresh = new Map<string, { unitPriceCents: number; stock: number; name: string; variantName: string }>();
      for (const p of products)
        for (const v of p.variants) fresh.set(v.id, { unitPriceCents: v.priceCents ?? p.priceCents, stock: v.stock, name: p.name, variantName: v.name });
      const before = JSON.stringify(useCart.getState().lines);
      useCart.getState().reconcile(fresh);
      setChanged(before !== JSON.stringify(useCart.getState().lines));
      setSynced(true);
    };
    if (useCart.persist.hasHydrated()) run();
    else return useCart.persist.onFinishHydration(() => run());
  }, []);

  return { changed, synced };
}
