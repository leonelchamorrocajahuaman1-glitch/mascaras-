"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Loader2, Lock } from "lucide-react";
import { useCart } from "@/lib/store/cart";
import { useHydrated } from "@/lib/hooks/useMedia";
import { CartLines, CartSummary } from "./CartDrawer";
import { useCartSync } from "./useCartSync";
import { TLink } from "../experience/RouteTransition";

const FIELDS = [
  { name: "name", label: "Nombre completo", autoComplete: "name", required: true, span: 2 },
  { name: "email", label: "Email", type: "email", autoComplete: "email", required: true },
  { name: "phone", label: "Teléfono (opcional)", type: "tel", autoComplete: "tel" },
  { name: "address", label: "Dirección", autoComplete: "street-address", required: true, span: 2 },
  { name: "city", label: "Ciudad", autoComplete: "address-level2", required: true },
  { name: "country", label: "País", autoComplete: "country-name", required: true },
] as const;

export function CheckoutForm() {
  const lines = useCart((s) => s.lines);
  const clear = useCart((s) => s.clear);
  const hydrated = useHydrated();
  const router = useRouter();
  const { changed } = useCartSync();
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  if (!hydrated) return null;
  if (!lines.length) {
    return (
      <div className="mt-12">
        <p className="text-bone/70">No hay productos en tu carrito.</p>
        <TLink href="/shop" className="mt-6 inline-block rounded-full bg-blood px-8 py-4 font-mono text-[11px] uppercase tracking-[0.3em] text-white">
          Ir a la tienda
        </TLink>
      </div>
    );
  }

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSending(true);
    const form = new FormData(e.currentTarget);
    const customer = Object.fromEntries(["name", "email", "phone", "address", "city", "country", "notes"].map((k) => [k, String(form.get(k) ?? "")]));
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customer, items: lines.map((l) => ({ productId: l.productId, variantId: l.variantId, quantity: l.quantity })) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "No se pudo registrar el pedido.");
      clear();
      router.push(`/order/${data.id}`);
    } catch (err) {
      setError((err as Error).message);
      setSending(false);
    }
  };

  return (
    <div className="mt-12 grid gap-12 lg:grid-cols-[1.4fr_1fr]">
      <form onSubmit={submit} className="space-y-8" noValidate={false}>
        <div role="note" className="flex gap-3 rounded-2xl border border-blood/40 bg-blood/10 p-5 text-sm leading-relaxed">
          <AlertTriangle size={18} className="mt-0.5 shrink-0 text-blood" />
          <p>
            <strong className="font-semibold">Checkout de demostración.</strong> No hay una pasarela de pago integrada: no se solicitan ni se procesan datos de tarjeta. El pedido quedará registrado como <em>pendiente de pago</em> y podrás verlo en el panel de administración.
          </p>
        </div>
        {changed && <p role="status" className="text-sm text-blood">Tu carrito se actualizó con los precios y existencias actuales.</p>}
        <fieldset className="grid gap-5 sm:grid-cols-2">
          <legend className="mb-4 font-display text-3xl font-black uppercase">Datos de envío</legend>
          {FIELDS.map((f) => (
            <label key={f.name} className={`flex flex-col gap-2 ${"span" in f && f.span === 2 ? "sm:col-span-2" : ""}`}>
              <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-steel">{f.label}</span>
              <input
                name={f.name}
                type={"type" in f ? f.type : "text"}
                autoComplete={f.autoComplete}
                required={"required" in f && f.required}
                minLength={f.name === "address" ? 4 : 2}
                maxLength={200}
                className="h-12 rounded-xl border border-bone/15 bg-coal px-4 text-sm focus:border-blood focus:outline-none"
              />
            </label>
          ))}
          <label className="flex flex-col gap-2 sm:col-span-2">
            <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-steel">Notas (opcional)</span>
            <textarea name="notes" rows={3} maxLength={500} className="rounded-xl border border-bone/15 bg-coal px-4 py-3 text-sm focus:border-blood focus:outline-none" />
          </label>
        </fieldset>
        {error && (
          <p role="alert" className="rounded-xl border border-blood bg-blood/15 px-4 py-3 text-sm">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={sending}
          className="flex h-14 w-full items-center justify-center gap-3 rounded-full bg-blood font-mono text-[11px] uppercase tracking-[0.3em] text-white transition hover:bg-ember disabled:opacity-60"
        >
          {sending ? <Loader2 size={16} className="animate-spin" /> : <Lock size={15} />}
          {sending ? "Registrando pedido…" : "Registrar pedido (demo, sin pago)"}
        </button>
      </form>
      <aside className="h-fit space-y-6 border border-bone/10 p-6 lg:sticky lg:top-28">
        <p className="font-display text-3xl font-black uppercase">Tu pedido</p>
        <CartLines compact />
        <CartSummary />
        <p className="text-xs text-steel">El total definitivo se recalcula en el servidor con los precios y existencias vigentes.</p>
      </aside>
    </div>
  );
}
