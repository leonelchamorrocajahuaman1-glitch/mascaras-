import Link from "next/link";
import { db } from "@/lib/db";
import { formatDate, formatMoney } from "@/lib/format";
import { ORDER_STATUSES, ORDER_STATUS_LABEL, type OrderStatus } from "@/lib/types";
import { PageHeader, StatusBadge } from "@/components/admin/ui";

export const metadata = { title: "Pedidos" };

export default async function OrdersPage({ searchParams }: { searchParams: Promise<{ status?: string; q?: string }> }) {
  const { status, q } = await searchParams;
  const all = await db().listOrders();
  const term = q?.trim().toLowerCase();
  const orders = all.filter(
    (o) =>
      (!status || o.status === status) &&
      (!term || `${o.number} ${o.customer.name} ${o.customer.email}`.toLowerCase().includes(term)),
  );
  const count = (s: OrderStatus) => all.filter((o) => o.status === s).length;

  return (
    <>
      <PageHeader title="Pedidos" subtitle={`${all.length} pedidos registrados · pagos en modo demostración`} />
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <Link href="/admin/orders" className={`rounded-full border px-4 py-2 text-sm ${!status ? "border-blood bg-blood text-white" : "border-bone/15"}`}>Todos ({all.length})</Link>
        {ORDER_STATUSES.map((s) => (
          <Link key={s} href={`/admin/orders?status=${s}`} className={`rounded-full border px-4 py-2 text-sm ${status === s ? "border-blood bg-blood text-white" : "border-bone/15 hover:border-bone/40"}`}>
            {ORDER_STATUS_LABEL[s]} ({count(s)})
          </Link>
        ))}
        <form className="ml-auto">
          {status && <input type="hidden" name="status" value={status} />}
          <input name="q" defaultValue={q} placeholder="Buscar nº, nombre o email" className="h-10 w-64 rounded-full border border-bone/15 bg-ink px-4 text-sm focus:border-blood focus:outline-none" />
        </form>
      </div>
      <div className="overflow-x-auto rounded-2xl border border-bone/10">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-bone/10 font-mono text-[10px] uppercase tracking-[0.2em] text-steel">
            <tr>
              <th className="px-4 py-3 font-normal">Pedido</th>
              <th className="px-4 py-3 font-normal">Cliente</th>
              <th className="px-4 py-3 font-normal">Fecha</th>
              <th className="px-4 py-3 font-normal">Artículos</th>
              <th className="px-4 py-3 font-normal">Total</th>
              <th className="px-4 py-3 font-normal">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-bone/10">
            {orders.map((o) => (
              <tr key={o.id} className="hover:bg-bone/[0.02]">
                <td className="px-4 py-3"><Link href={`/admin/orders/${o.id}`} className="font-medium hover:text-blood">#{o.number}</Link></td>
                <td className="px-4 py-3"><p>{o.customer.name}</p><p className="text-xs text-steel">{o.customer.email}</p></td>
                <td className="px-4 py-3 text-bone/70">{formatDate(o.createdAt)}</td>
                <td className="px-4 py-3 tabular-nums">{o.items.reduce((s, i) => s + i.quantity, 0)}</td>
                <td className="px-4 py-3 tabular-nums">{formatMoney(o.totalCents)}</td>
                <td className="px-4 py-3"><StatusBadge status={o.status} /></td>
              </tr>
            ))}
            {!orders.length && (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-steel">No hay pedidos con estos filtros.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
