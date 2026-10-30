import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requirePagePermission } from "@/lib/auth/server";
import { can } from "@/lib/auth/permissions";
import { formatDate, formatMoney } from "@/lib/format";
import { Card, PageHeader, PaymentBadge, StatusBadge } from "@/components/admin/ui";
import { CustomerControls } from "@/components/admin/CustomerControls";

export const metadata = { title: "Cliente" };

export default async function CustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requirePagePermission("customers:view");
  const { id } = await params;
  const [customer, orders] = await Promise.all([db().getCustomer(id), db().listOrders()]);
  if (!customer) notFound();
  const history = orders.filter((o) => o.customerId === customer.id || o.customer.email === customer.email);
  const spent = history.filter((o) => o.status !== "cancelled").reduce((s, o) => s + o.totalCents, 0);

  return (
    <>
      <Link href="/admin/clientes" className="text-sm text-steel hover:text-bone">← Clientes</Link>
      <div className="mt-4">
        <PageHeader
          kicker="Cliente"
          title={customer.name || customer.email}
          subtitle={`Cliente desde ${formatDate(customer.createdAt)}`}
          actions={customer.status === "active" ? <span className="text-sm text-emerald-300">Activo</span> : <span className="rounded-full bg-blood/15 px-3 py-1 text-sm text-blood">Suspendido</span>}
        />
      </div>
      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <Card className="p-6">
          <h2 className="mb-4 font-display text-2xl font-black uppercase">Historial de pedidos</h2>
          {history.length === 0 ? (
            <p className="text-sm text-steel">Sin pedidos.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-left text-sm">
                <thead className="font-mono text-[10px] uppercase tracking-[0.2em] text-steel">
                  <tr><th className="py-2 font-normal">Pedido</th><th className="py-2 font-normal">Fecha</th><th className="py-2 font-normal">Estado</th><th className="py-2 font-normal">Pago</th><th className="py-2 text-right font-normal">Total</th></tr>
                </thead>
                <tbody className="divide-y divide-bone/5">
                  {history.map((o) => (
                    <tr key={o.id}>
                      <td className="py-2.5"><Link href={`/admin/pedidos/${o.id}`} className="hover:text-blood">#{o.number}</Link></td>
                      <td className="py-2.5 text-steel">{formatDate(o.createdAt)}</td>
                      <td className="py-2.5"><StatusBadge status={o.status} /></td>
                      <td className="py-2.5"><PaymentBadge status={o.paymentStatus} /></td>
                      <td className="py-2.5 text-right tabular-nums">{formatMoney(o.totalCents)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
        <div className="space-y-6">
          <Card className="space-y-2 p-6 text-sm">
            <h2 className="mb-2 font-display text-2xl font-black uppercase">Datos</h2>
            <p><a href={`mailto:${customer.email}`} className="text-blood hover:underline">{customer.email}</a></p>
            {customer.phone && <p>{customer.phone}</p>}
            <p className="text-bone/70">{[customer.city, customer.country].filter(Boolean).join(", ")}</p>
            <p className="pt-2 text-steel">{history.length} pedido(s) · {formatMoney(spent)} (sin cancelados)</p>
            {customer.status === "suspended" && customer.suspendedReason && <p className="rounded-xl bg-blood/10 p-3 text-blood">Motivo: {customer.suspendedReason}</p>}
            <p className="pt-2 text-xs text-steel">Las direcciones completas figuran en cada pedido. No se almacenan contraseñas ni datos de pago.</p>
          </Card>
          <Card className="p-6">
            <h2 className="mb-4 font-display text-2xl font-black uppercase">Gestión</h2>
            <CustomerControls customer={customer} canManage={can(session.role, "customers:manage")} />
          </Card>
        </div>
      </div>
    </>
  );
}
