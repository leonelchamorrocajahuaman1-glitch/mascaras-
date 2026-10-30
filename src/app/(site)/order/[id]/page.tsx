import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CheckCircle2, Circle, XCircle } from "lucide-react";
import { db } from "@/lib/db";
import { formatDate, formatMoney } from "@/lib/format";
import { ORDER_STATUS_LABEL, PAYMENT_METHOD_LABEL, PAYMENT_STATUS_LABEL, type OrderStatus } from "@/lib/types";
import { TLink } from "@/components/experience/RouteTransition";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Tu pedido", robots: { index: false } };

const FLOW: OrderStatus[] = ["pending", "confirmed", "processing", "shipped", "delivered"];

export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const order = await db().getOrder(id);
  if (!order) notFound();

  const reached = (s: OrderStatus) => order.history.find((h) => h.type === "status" && h.status === s);
  const currentIdx = FLOW.indexOf(order.status);
  const cancelled = order.status === "cancelled";

  return (
    <div className="min-h-screen px-[var(--gutter)] pb-32 pt-32">
      <p className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.3em] text-blood">
        <CheckCircle2 size={14} /> Pedido #{order.number}
      </p>
      <h1 className="mt-4 font-display text-[clamp(64px,10vw,180px)] font-black uppercase leading-[0.82]">
        Gracias, <span className="text-outline">{order.customer.name.split(" ")[0]}</span>
      </h1>

      {/* Seguimiento: el estado lo actualiza la tienda desde su panel */}
      <section aria-label="Estado del pedido" className="mt-10 max-w-4xl">
        {cancelled ? (
          <p className="flex items-center gap-3 rounded-2xl border border-bone/15 bg-coal p-5 text-sm">
            <XCircle className="text-blood" size={18} /> Este pedido fue <strong>cancelado</strong>
            {reached("cancelled") ? ` el ${formatDate(reached("cancelled")!.at)}` : ""}.
          </p>
        ) : (
          <ol className="grid gap-3 sm:grid-cols-5">
            {FLOW.map((s, i) => {
              const done = i <= currentIdx;
              const at = reached(s)?.at;
              return (
                <li key={s} className={`rounded-2xl border p-4 ${i === currentIdx ? "border-blood bg-blood/10" : done ? "border-bone/20" : "border-bone/10 opacity-50"}`}>
                  <span className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em]">
                    {done ? <CheckCircle2 size={13} className="text-blood" /> : <Circle size={13} />} {ORDER_STATUS_LABEL[s]}
                  </span>
                  <span className="mt-1 block text-[11px] text-steel">{at ? formatDate(at) : "—"}</span>
                </li>
              );
            })}
          </ol>
        )}
        <p className="mt-4 rounded-2xl border border-bone/10 p-4 text-sm leading-relaxed text-bone/80">
          Pago: <strong>{PAYMENT_STATUS_LABEL[order.paymentStatus]}</strong>
          {order.paymentStatus === "paid" ? ` · ${PAYMENT_METHOD_LABEL[order.paymentMethod]}` : " · no se ha realizado ningún cobro en la web"}. Guarda esta página
          para consultar el estado de tu pedido.
        </p>
      </section>

      <div className="mt-12 grid gap-10 lg:grid-cols-[1.5fr_1fr]">
        <ul className="divide-y divide-bone/10 border-y border-bone/10">
          {order.items.map((i) => (
            <li key={i.variantId} className="flex items-center justify-between gap-4 py-5">
              <div>
                <p className="font-display text-3xl font-black uppercase">{i.productName}</p>
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-steel">
                  {i.variantName} · SKU {i.sku} · {i.quantity} × {formatMoney(i.unitPriceCents)}
                </p>
              </div>
              <p className="font-mono tabular-nums">{formatMoney(i.unitPriceCents * i.quantity)}</p>
            </li>
          ))}
        </ul>
        <dl className="h-fit space-y-2 border border-bone/10 p-6 font-mono text-xs uppercase tracking-[0.15em]">
          <div className="flex justify-between text-steel"><dt>Fecha</dt><dd className="text-bone normal-case">{formatDate(order.createdAt)}</dd></div>
          <div className="flex justify-between text-steel"><dt>Subtotal</dt><dd className="text-bone">{formatMoney(order.subtotalCents)}</dd></div>
          <div className="flex justify-between text-steel"><dt>Envío</dt><dd className="text-bone">{order.shippingCents ? formatMoney(order.shippingCents) : "Gratis"}</dd></div>
          <div className="flex justify-between border-t border-bone/10 pt-3 text-sm"><dt>Total</dt><dd>{formatMoney(order.totalCents)}</dd></div>
          <div className="pt-4 text-[10px] normal-case tracking-normal text-steel">Envío a: {order.customer.address}, {order.customer.city}, {order.customer.country}</div>
        </dl>
      </div>
      <TLink href="/shop" className="mt-12 inline-block rounded-full border border-bone/20 px-8 py-4 font-mono text-[11px] uppercase tracking-[0.3em] hover:border-blood">
        Seguir explorando
      </TLink>
    </div>
  );
}
