import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requirePagePermission } from "@/lib/auth/server";
import { can } from "@/lib/auth/permissions";
import { formatDate, formatMoney } from "@/lib/format";
import { ORDER_STATUS_LABEL, PAYMENT_METHOD_LABEL, PAYMENT_STATUS_LABEL } from "@/lib/types";
import { Card, PageHeader, PaymentBadge, StatusBadge } from "@/components/admin/ui";
import { OrderPaymentControl, OrderStatusControl } from "@/components/admin/OrderControls";

export const metadata = { title: "Pedido" };

export default async function OrderDetail({ params }: { params: Promise<{ id: string }> }) {
  const session = await requirePagePermission("orders:view");
  const order = await db().getOrder((await params).id);
  if (!order) notFound();
  const c = order.customer;
  const canUpdate = can(session.role, "orders:update");

  return (
    <>
      <Link href="/admin/pedidos" className="text-sm text-steel hover:text-bone">← Pedidos</Link>
      <div className="mt-4">
        <PageHeader
          kicker={order.isTest ? "Pedido de prueba" : "Ventas"}
          title={`Pedido #${order.number}`}
          subtitle={`Creado ${formatDate(order.createdAt)} · actualizado ${formatDate(order.updatedAt)}`}
          actions={<><StatusBadge status={order.status} /><PaymentBadge status={order.paymentStatus} /></>}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <div className="space-y-6">
          {canUpdate && (
            <Card className="p-6">
              <h2 className="mb-4 font-display text-2xl font-black uppercase">Estado del pedido</h2>
              <OrderStatusControl order={order} />
              <p className="mt-4 text-xs text-steel">El cliente ve el estado en la página de su pedido. Cancelar repone el stock; reactivar un cancelado lo vuelve a descontar (nunca dos veces).</p>
            </Card>
          )}
          <Card className="p-6">
            <h2 className="mb-4 font-display text-2xl font-black uppercase">Productos comprados</h2>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-left text-sm">
                <thead className="font-mono text-[10px] uppercase tracking-[0.2em] text-steel">
                  <tr><th className="py-2 font-normal">Producto</th><th className="py-2 font-normal">SKU</th><th className="py-2 text-right font-normal">Cant.</th><th className="py-2 text-right font-normal">Precio</th><th className="py-2 text-right font-normal">Subtotal</th></tr>
                </thead>
                <tbody className="divide-y divide-bone/5">
                  {order.items.map((i) => (
                    <tr key={i.variantId}>
                      <td className="py-2.5"><p className="font-medium">{i.productName}</p><p className="text-xs text-steel">{i.variantName}</p></td>
                      <td className="py-2.5 font-mono text-xs text-steel">{i.sku}</td>
                      <td className="py-2.5 text-right tabular-nums">{i.quantity}</td>
                      <td className="py-2.5 text-right tabular-nums">{formatMoney(i.unitPriceCents)}</td>
                      <td className="py-2.5 text-right tabular-nums">{formatMoney(i.unitPriceCents * i.quantity)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <dl className="mt-4 space-y-1 border-t border-bone/10 pt-4 text-sm">
              <div className="flex justify-between text-steel"><dt>Subtotal</dt><dd className="text-bone tabular-nums">{formatMoney(order.subtotalCents)}</dd></div>
              <div className="flex justify-between text-steel"><dt>Envío</dt><dd className="text-bone tabular-nums">{formatMoney(order.shippingCents)}</dd></div>
              <div className="flex justify-between text-base font-semibold"><dt>Total</dt><dd className="tabular-nums">{formatMoney(order.totalCents)}</dd></div>
            </dl>
          </Card>
          <Card className="p-6">
            <h2 className="mb-4 font-display text-2xl font-black uppercase">Historial</h2>
            <ol className="relative space-y-4 border-l border-bone/10 pl-5">
              {order.history.slice().reverse().map((h, i) => (
                <li key={i} className="relative text-sm">
                  <span className={`absolute -left-[25px] top-1 h-2.5 w-2.5 rounded-full ${i === 0 ? "bg-blood shadow-[0_0_10px_#e1121f]" : "bg-graphite"}`} />
                  <p>
                    {h.type === "status" && h.status ? <>Estado: <strong>{ORDER_STATUS_LABEL[h.status]}</strong></> : h.type === "payment" && h.paymentStatus ? <>Pago: <strong>{PAYMENT_STATUS_LABEL[h.paymentStatus]}</strong></> : "Nota"}
                    {h.note ? <span className="text-steel"> · {h.note}</span> : null}
                  </p>
                  <p className="text-xs text-steel">{formatDate(h.at)} · {h.by}</p>
                </li>
              ))}
            </ol>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="space-y-2 p-6 text-sm">
            <h2 className="mb-2 font-display text-2xl font-black uppercase">Cliente</h2>
            <p className="font-medium">{c.name}</p>
            <p><a href={`mailto:${c.email}`} className="text-blood hover:underline">{c.email}</a></p>
            {c.phone && <p>{c.phone}</p>}
            <p className="text-bone/70">{c.address}<br />{c.city}, {c.country}</p>
            {c.notes && <p className="rounded-xl bg-black/40 p-3 text-bone/70">“{c.notes}”</p>}
            {order.customerId && <Link href={`/admin/clientes/${order.customerId}`} className="inline-block pt-2 text-xs text-steel hover:text-bone">Ver ficha e historial del cliente →</Link>}
          </Card>
          <Card className="space-y-4 p-6 text-sm">
            <h2 className="font-display text-2xl font-black uppercase">Pago</h2>
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5">
              <dt className="text-steel">Estado</dt><dd><PaymentBadge status={order.paymentStatus} /></dd>
              <dt className="text-steel">Método</dt><dd>{PAYMENT_METHOD_LABEL[order.paymentMethod]}</dd>
              <dt className="text-steel">Referencia</dt><dd>{order.paymentRef ?? "—"}</dd>
              <dt className="text-steel">Fecha de cobro</dt><dd>{order.paidAt ? formatDate(order.paidAt) : "—"}</dd>
            </dl>
            <OrderPaymentControl order={order} canPay={can(session.role, "orders:payment")} />
          </Card>
        </div>
      </div>
    </>
  );
}
