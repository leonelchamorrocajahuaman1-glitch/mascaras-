import Link from "next/link";
import { Search } from "lucide-react";
import { db } from "@/lib/db";
import { requirePagePermission } from "@/lib/auth/server";
import { formatDate, formatMoney } from "@/lib/format";
import { ORDER_STATUSES, ORDER_STATUS_LABEL, PAYMENT_METHOD_LABEL, PAYMENT_STATUSES, PAYMENT_STATUS_LABEL } from "@/lib/types";
import { EmptyState, PageHeader, PaymentBadge, StatusBadge, inputCls } from "@/components/admin/ui";

export const metadata = { title: "Pedidos" };

type SP = { status?: string; pago?: string; q?: string; desde?: string; hasta?: string; pruebas?: string };

export default async function OrdersPage({ searchParams }: { searchParams: Promise<SP> }) {
  await requirePagePermission("orders:view");
  const sp = await searchParams;
  const all = await db().listOrders();
  const showTests = sp.pruebas === "1";
  const base = all.filter((o) => showTests || !o.isTest);
  const term = sp.q?.trim().toLowerCase();
  const from = sp.desde ? new Date(`${sp.desde}T00:00:00`) : null;
  const to = sp.hasta ? new Date(`${sp.hasta}T23:59:59`) : null;
  const orders = base.filter(
    (o) =>
      (!sp.status || o.status === sp.status) &&
      (!sp.pago || o.paymentStatus === sp.pago) &&
      (!term || `${o.number} ${o.customer.name} ${o.customer.email} ${o.items.map((i) => i.sku).join(" ")}`.toLowerCase().includes(term)) &&
      (!from || new Date(o.createdAt) >= from) &&
      (!to || new Date(o.createdAt) <= to),
  );
  const count = (s: string) => base.filter((o) => o.status === s).length;
  const qs = (patch: Partial<SP>) => {
    const p = new URLSearchParams(Object.entries({ ...sp, ...patch }).filter(([, v]) => v) as [string, string][]);
    return `/admin/pedidos${p.toString() ? `?${p}` : ""}`;
  };
  const total = orders.filter((o) => o.status !== "cancelled").reduce((s, o) => s + o.totalCents, 0);

  return (
    <>
      <PageHeader kicker="Ventas" title="Pedidos" subtitle={`${base.length} pedidos · ${all.length - base.length + (showTests ? all.filter((o) => o.isTest).length : 0)} de prueba ${showTests ? "visibles" : "ocultos"}`} />

      <nav aria-label="Filtrar por estado" className="mb-4 flex flex-wrap gap-2">
        <Link href={qs({ status: undefined })} className={`rounded-full border px-4 py-2 text-sm ${!sp.status ? "border-blood bg-blood text-white" : "border-bone/15 hover:border-bone/40"}`}>Todos ({base.length})</Link>
        {ORDER_STATUSES.map((s) => (
          <Link key={s} href={qs({ status: s })} className={`rounded-full border px-4 py-2 text-sm ${sp.status === s ? "border-blood bg-blood text-white" : "border-bone/15 hover:border-bone/40"}`}>
            {ORDER_STATUS_LABEL[s]} ({count(s)})
          </Link>
        ))}
      </nav>

      <form className="mb-5 grid gap-3 rounded-2xl border border-bone/10 bg-white/[0.02] p-4 md:grid-cols-[1.5fr_1fr_1fr_1fr_auto]">
        {sp.status && <input type="hidden" name="status" value={sp.status} />}
        <label className="relative">
          <span className="sr-only">Buscar</span>
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-steel" />
          <input name="q" defaultValue={sp.q} placeholder="Nº, cliente, email o SKU" className={`${inputCls} pl-9`} />
        </label>
        <select name="pago" defaultValue={sp.pago ?? ""} aria-label="Estado del pago" className={inputCls}>
          <option value="">Pago: todos</option>
          {PAYMENT_STATUSES.map((p) => <option key={p} value={p}>{PAYMENT_STATUS_LABEL[p]}</option>)}
        </select>
        <label className="flex items-center gap-2 text-xs text-steel">Desde<input type="date" name="desde" defaultValue={sp.desde} className={inputCls} /></label>
        <label className="flex items-center gap-2 text-xs text-steel">Hasta<input type="date" name="hasta" defaultValue={sp.hasta} className={inputCls} /></label>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-xs text-steel"><input type="checkbox" name="pruebas" value="1" defaultChecked={showTests} className="h-4 w-4 accent-[#e1121f]" /> Pruebas</label>
          <button className="rounded-full bg-bone px-4 py-2 text-sm text-ink hover:bg-blood hover:text-white">Filtrar</button>
        </div>
      </form>

      <p className="mb-3 text-xs text-steel">{orders.length} resultado(s) · importe (sin cancelados): <span className="text-bone">{formatMoney(total)}</span></p>
      {orders.length === 0 ? (
        <EmptyState title="Sin pedidos">No hay pedidos con estos filtros.</EmptyState>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-bone/10 bg-white/[0.02]">
          <table className="w-full min-w-[920px] text-left text-sm">
            <thead className="border-b border-bone/10 font-mono text-[10px] uppercase tracking-[0.2em] text-steel">
              <tr>
                <th className="px-4 py-3 font-normal">Pedido</th>
                <th className="px-4 py-3 font-normal">Fecha</th>
                <th className="px-4 py-3 font-normal">Cliente</th>
                <th className="px-4 py-3 font-normal">Artículos</th>
                <th className="px-4 py-3 font-normal">Total</th>
                <th className="px-4 py-3 font-normal">Pago</th>
                <th className="px-4 py-3 font-normal">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-bone/5">
              {orders.map((o) => (
                <tr key={o.id} className="hover:bg-bone/[0.02]">
                  <td className="px-4 py-3">
                    <Link href={`/admin/pedidos/${o.id}`} className="font-medium hover:text-blood">#{o.number}</Link>
                    {o.isTest && <span className="ml-2 rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] text-amber-300">PRUEBA</span>}
                  </td>
                  <td className="px-4 py-3 text-bone/70">{formatDate(o.createdAt)}</td>
                  <td className="px-4 py-3"><p>{o.customer.name}</p><p className="text-xs text-steel">{o.customer.email}</p></td>
                  <td className="px-4 py-3 tabular-nums">{o.items.reduce((s, i) => s + i.quantity, 0)}</td>
                  <td className="px-4 py-3 tabular-nums">{formatMoney(o.totalCents)}</td>
                  <td className="px-4 py-3"><PaymentBadge status={o.paymentStatus} /><p className="mt-1 text-[11px] text-steel">{PAYMENT_METHOD_LABEL[o.paymentMethod]}</p></td>
                  <td className="px-4 py-3"><StatusBadge status={o.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
