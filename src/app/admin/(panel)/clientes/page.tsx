import Link from "next/link";
import { Search } from "lucide-react";
import { db } from "@/lib/db";
import { requirePagePermission } from "@/lib/auth/server";
import { formatDate, formatMoney } from "@/lib/format";
import { EmptyState, PageHeader, inputCls } from "@/components/admin/ui";

export const metadata = { title: "Clientes" };

export default async function CustomersPage({ searchParams }: { searchParams: Promise<{ q?: string; estado?: string }> }) {
  await requirePagePermission("customers:view");
  const { q, estado } = await searchParams;
  const [customers, orders] = await Promise.all([db().listCustomers(), db().listOrders()]);
  const stats = new Map<string, { count: number; spent: number; last: string }>();
  for (const o of orders) {
    if (!o.customerId) continue;
    const s = stats.get(o.customerId) ?? { count: 0, spent: 0, last: o.createdAt };
    s.count += 1;
    if (o.status !== "cancelled") s.spent += o.totalCents;
    if (o.createdAt > s.last) s.last = o.createdAt;
    stats.set(o.customerId, s);
  }
  const term = q?.trim().toLowerCase();
  const list = customers.filter((c) => (!term || `${c.name} ${c.email} ${c.city} ${c.country}`.toLowerCase().includes(term)) && (!estado || c.status === estado));

  return (
    <>
      <PageHeader kicker="Clientes" title="Clientes" subtitle={`${customers.length} clientes registrados a partir de sus pedidos`} />
      <p className="mb-5 max-w-3xl text-sm leading-relaxed text-steel">
        La tienda no tiene cuentas con contraseña: cada cliente se registra automáticamente al hacer su primer pedido (identificado por su email). Desde aquí puedes consultar su historial y suspenderlo; un cliente suspendido no puede hacer pedidos nuevos.
      </p>
      <form className="mb-5 flex flex-wrap gap-3">
        <label className="relative min-w-[240px] flex-1">
          <span className="sr-only">Buscar clientes</span>
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-steel" />
          <input name="q" defaultValue={q} placeholder="Nombre, email, ciudad…" className={`${inputCls} pl-9`} />
        </label>
        <select name="estado" defaultValue={estado ?? ""} aria-label="Estado" className={`${inputCls} w-auto`}>
          <option value="">Todos</option>
          <option value="active">Activos</option>
          <option value="suspended">Suspendidos</option>
        </select>
        <button className="rounded-full bg-bone px-5 text-sm text-ink hover:bg-blood hover:text-white">Buscar</button>
      </form>
      {list.length === 0 ? (
        <EmptyState title="Sin clientes">{customers.length ? "Ningún cliente coincide con la búsqueda." : "Los clientes aparecerán cuando se realicen pedidos en la tienda."}</EmptyState>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-bone/10 bg-white/[0.02]">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="border-b border-bone/10 font-mono text-[10px] uppercase tracking-[0.2em] text-steel">
              <tr><th className="px-4 py-3 font-normal">Cliente</th><th className="px-4 py-3 font-normal">Ubicación</th><th className="px-4 py-3 font-normal">Pedidos</th><th className="px-4 py-3 font-normal">Importe</th><th className="px-4 py-3 font-normal">Último pedido</th><th className="px-4 py-3 font-normal">Estado</th></tr>
            </thead>
            <tbody className="divide-y divide-bone/5">
              {list.map((c) => {
                const s = stats.get(c.id);
                return (
                  <tr key={c.id} className="hover:bg-bone/[0.02]">
                    <td className="px-4 py-3"><Link href={`/admin/clientes/${c.id}`} className="font-medium hover:text-blood">{c.name || "—"}</Link><p className="text-xs text-steel">{c.email}</p></td>
                    <td className="px-4 py-3 text-bone/70">{[c.city, c.country].filter(Boolean).join(", ")}</td>
                    <td className="px-4 py-3 tabular-nums">{s?.count ?? 0}</td>
                    <td className="px-4 py-3 tabular-nums">{formatMoney(s?.spent ?? 0)}</td>
                    <td className="px-4 py-3 text-bone/70">{s ? formatDate(s.last) : "—"}</td>
                    <td className="px-4 py-3">{c.status === "active" ? <span className="text-xs text-emerald-300">Activo</span> : <span className="rounded-full bg-blood/15 px-2.5 py-1 text-xs text-blood">Suspendido</span>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
