import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { formatDate, formatMoney } from "@/lib/format";
import { Card, PageHeader, StatusBadge } from "@/components/admin/ui";
import { OrderStatusControl } from "@/components/admin/OrderStatusControl";

export const metadata = { title: "Pedido" };

export default async function OrderDetail({ params }: { params: Promise<{ id: string }> }) {
  const order = await db().getOrder((await params).id);
  if (!order) notFound();
  const c = order.customer;
  return (
    <>
      <Link href="/admin/orders" className="text-sm text-steel hover:text-bone">← Pedidos</Link>
      <div className="mt-4">
        <PageHeader title={`Pedido #${order.number}`} subtitle={`${formatDate(order.createdAt)} · actualizado ${formatDate(order.updatedAt)}`} actions={<StatusBadge status={order.status} />} />
      </div>
      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <div className="space-y-6">
          <Card className="p-6">
            <h2 className="mb-4 font-display text-2xl font-black uppercase">Estado</h2>
            <OrderStatusControl id={order.id} status={order.status} />
            <p className="mt-4 text-xs text-steel">Cancelar repone el stock; reactivar un pedido cancelado vuelve a descontarlo.</p>
          </Card>
          <Card className="p-6">
            <h2 className="mb-4 font-display text-2xl font-black uppercase">Artículos</h2>
            <ul className="divide-y divide-bone/10">
              {order.items.map((i) => (
                <li key={i.variantId} className="flex justify-between gap-4 py-3 text-sm">
                  <div>
                    <p className="font-medium">{i.productName}</p>
                    <p className="text-xs text-steel">{i.variantName} · SKU {i.sku}</p>
                  </div>
                  <p className="tabular-nums">{i.quantity} × {formatMoney(i.unitPriceCents)} = <strong>{formatMoney(i.quantity * i.unitPriceCents)}</strong></p>
                </li>
              ))}
            </ul>
            <dl className="mt-4 space-y-1 border-t border-bone/10 pt-4 text-sm">
              <div className="flex justify-between text-steel"><dt>Subtotal</dt><dd className="text-bone">{formatMoney(order.subtotalCents)}</dd></div>
              <div className="flex justify-between text-steel"><dt>Envío</dt><dd className="text-bone">{formatMoney(order.shippingCents)}</dd></div>
              <div className="flex justify-between text-base font-semibold"><dt>Total</dt><dd>{formatMoney(order.totalCents)}</dd></div>
            </dl>
          </Card>
        </div>
        <div className="space-y-6">
          <Card className="space-y-2 p-6 text-sm">
            <h2 className="mb-2 font-display text-2xl font-black uppercase">Cliente</h2>
            <p>{c.name}</p>
            <p><a href={`mailto:${c.email}`} className="text-blood hover:underline">{c.email}</a></p>
            {c.phone && <p>{c.phone}</p>}
            <p className="text-bone/70">{c.address}<br />{c.city}, {c.country}</p>
            {c.notes && <p className="rounded-xl bg-ink p-3 text-bone/70">“{c.notes}”</p>}
          </Card>
          <Card className="p-6 text-sm">
            <h2 className="mb-2 font-display text-2xl font-black uppercase">Pago</h2>
            <p className="text-bone/70">{order.paymentStatus === "demo_unpaid" ? "Demostración — no se ha procesado ningún pago. Integra una pasarela (p. ej. Stripe) para cobrar." : order.paymentStatus}</p>
          </Card>
        </div>
      </div>
    </>
  );
}
