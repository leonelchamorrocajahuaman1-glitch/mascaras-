"use client";

import { useState } from "react";
import { Check, ShoppingBag, Box } from "lucide-react";
import { formatMoney } from "@/lib/format";
import { siteConfig } from "@/lib/config";
import { useCart } from "@/lib/store/cart";
import { useExperience } from "@/lib/store/experience";
import type { MaskKey } from "@/lib/types";
import { TLink } from "../experience/RouteTransition";
import { QuantityStepper } from "./QuantityStepper";

interface Props {
  product: {
    id: string;
    slug: string;
    name: string;
    modelKey: MaskKey;
    image: string | null;
    priceCents: number;
    compareAtCents: number | null;
    variants: { id: string; name: string; sku: string; stock: number; priceCents: number | null }[];
  };
}

export function ProductPurchase({ product }: Props) {
  const firstAvailable = product.variants.find((v) => v.stock > 0) ?? product.variants[0];
  const [variantId, setVariantId] = useState(firstAvailable?.id);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const add = useCart((s) => s.add);
  const inCart = useCart((s) => s.lines.find((l) => l.variantId === variantId)?.quantity ?? 0);
  const setCartOpen = useExperience((s) => s.setCartOpen);

  const variant = product.variants.find((v) => v.id === variantId);
  const price = variant?.priceCents ?? product.priceCents;
  const available = Math.max(0, (variant?.stock ?? 0) - inCart);
  const maxQty = Math.min(available, siteConfig.maxQuantityPerItem);

  const onAdd = () => {
    if (!variant || maxQty < 1) return;
    add(
      {
        productId: product.id,
        variantId: variant.id,
        slug: product.slug,
        name: product.name,
        variantName: variant.name,
        image: product.image,
        unitPriceCents: price,
        maxStock: variant.stock,
      },
      Math.min(qty, maxQty),
    );
    setAdded(true);
    setQty(1);
    window.setTimeout(() => setAdded(false), 1800);
    window.setTimeout(() => setCartOpen(true), 350);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end gap-x-5 gap-y-1">
        <p className="font-display text-6xl font-black tabular-nums">{formatMoney(price)}</p>
        {product.compareAtCents && <p className="pb-2 font-mono text-sm text-steel line-through">{formatMoney(product.compareAtCents)}</p>}
        <p className="w-full font-mono text-[10px] uppercase tracking-[0.25em] text-steel">Precio demostrativo · impuestos no aplicados</p>
      </div>

      <fieldset>
        <legend className="mb-3 font-mono text-[10px] uppercase tracking-[0.3em] text-steel">Variante</legend>
        <div className="flex flex-wrap gap-2">
          {product.variants.map((v) => {
            const out = v.stock <= 0;
            const on = v.id === variantId;
            return (
              <button
                key={v.id}
                type="button"
                onClick={() => {
                  setVariantId(v.id);
                  setQty(1);
                }}
                disabled={out}
                aria-pressed={on}
                className={`relative rounded-full border px-5 py-3 font-mono text-[11px] uppercase tracking-[0.2em] transition ${
                  on ? "border-blood bg-blood text-white" : "border-bone/15 hover:border-bone/50"
                } ${out ? "cursor-not-allowed opacity-40 line-through" : ""}`}
              >
                {v.name}
                {v.priceCents !== null && v.priceCents !== product.priceCents && <span className="ml-2 opacity-70">{formatMoney(v.priceCents)}</span>}
              </button>
            );
          })}
        </div>
        <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.2em] text-steel" aria-live="polite">
          {variant && variant.stock > 0 ? (
            <>
              <span className={variant.stock <= 3 ? "text-blood" : "text-bone/80"}>{variant.stock <= 3 ? `Últimas ${variant.stock} unidades` : `${variant.stock} en stock`}</span>
              {inCart > 0 && ` · ${inCart} en tu carrito`} · SKU {variant.sku}
            </>
          ) : (
            "Agotado"
          )}
        </p>
      </fieldset>

      <div className="flex flex-wrap items-center gap-4">
        <QuantityStepper value={Math.min(qty, Math.max(1, maxQty))} max={Math.max(1, maxQty)} onChange={setQty} label="Cantidad" />
        <button
          type="button"
          onClick={onAdd}
          disabled={maxQty < 1}
          className="group relative flex h-14 flex-1 items-center justify-center gap-3 overflow-hidden rounded-full bg-blood px-8 font-mono text-[11px] uppercase tracking-[0.3em] text-white transition disabled:cursor-not-allowed disabled:bg-graphite disabled:text-steel"
        >
          <span className="absolute inset-0 origin-left scale-x-0 bg-bone transition-transform duration-500 ease-[var(--ease-cine)] group-enabled:group-hover:scale-x-100" />
          <span className="relative flex items-center gap-3 transition-colors duration-500 group-enabled:group-hover:text-ink">
            {added ? <Check size={16} /> : <ShoppingBag size={16} />}
            {maxQty < 1 ? (variant && variant.stock > 0 ? "Máximo en carrito" : "Agotado") : added ? "Añadido" : "Añadir al carrito"}
          </span>
        </button>
      </div>

      <TLink
        href={`/lab?model=${product.modelKey}`}
        className="flex items-center justify-center gap-3 rounded-full border border-bone/15 py-4 font-mono text-[11px] uppercase tracking-[0.3em] transition hover:border-blood"
      >
        <Box size={15} /> Explorar en el 3D Mask Lab
      </TLink>
    </div>
  );
}
