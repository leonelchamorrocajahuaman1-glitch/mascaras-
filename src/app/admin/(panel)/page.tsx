import Link from "next/link";
import { db } from "@/lib/db";
import { formatDate, formatMoney } from "@/lib/format";
import { Card, PageHeader, StatusBadge } from "@/components/admin/ui";
import { SeedButton } from "@/components/admin/SeedButton";

export const metadata = { title: "Resumen" };

export default async function Dashboard() {
  const [products, orders] = await Promise.all([db().listProducts({ includeInactive: true }), db().listOrders()]);
  const lowStock = products.flatMap((p) => p.variants.filter((v) => v.stock <= 3).map((v) => ({ p, v })));
  const active = orders.filter((o) => o.status !== "cancelled");
  const revenue = active.reduce((s, o) => s + o.totalCents, 0);
  const pending = orders.filter((o) => o.status === "pending").length;

  const stats = [
    { label: "Productos", value: products.length, hint: `${products.filter((p) => p.active).length} activos` },
    { label: "Pedidos", value: orders.length, hint: `${pending} pendientes` },
    { label: "Ventas (demo)", value: formatMoney(revenue), hint: "Sin cobros reales" },
    { label: "Stock bajo", value: lowStock.length, hint: "Variantes con ≤ 3 uds" },
  ];

  return (
    <>
      <PageHeader title="Resumen" subtitle="Estado de la tienda en tiempo real." />
      {products.length === 0 && (
        <Card className="mb-8 flex flex-wrap items-center justify-between gap-4 p-6">
          <p className="text-sm text-bone/80">No hay productos todavía. Puedes crear uno nuevo o importar el catálogo inicial.</p>
          <SeedButton />
        </Card>
      )}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label} className="p-6">
            <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-steel">{s.label}</p>
            <p className="mt-3 font-display text-5xl font-black tabular-nums">{s.value}</p>
            <p className="mt-1 text-xs text-steel">{s.hint}</p>
          </Card>
        ))}
      </div>
      <div className="mt-8 grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <Card className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-2xl font-black uppercase">Últimos pedidos</h2>
            <Link href="/admin/orders" className="text-sm text-steel hover:text-bone">Ver todos →</Link>
          </div>
          {orders.length === 0 ? (
            <p className="text-sm text-steel">Aún no hay pedidos. Prueba a comprar desde la tienda.</p>
          ) : (
            <ul className="divide-y divide-bone/10">
              {orders.slice(0, 6).map((o) => (
                <li key={o.id}>
                  <Link href={`/admin/orders/${o.id}`} className="flex items-center justify-between gap-4 py-3 hover:text-blood">
                    <span className="text-sm">#{o.number} · {o.customer.name}</span>
                    <span className="flex items-center gap-3 text-sm">
                      <StatusBadge status={o.status} />
                      <span className="hidden text-steel sm:inline">{formatDate(o.createdAt)}</span>
                      <span className="tabular-nums">{formatMoney(o.totalCents)}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card className="p-6">
          <h2 className="mb-4 font-display text-2xl font-black uppercase">Stock bajo</h2>
          {lowStock.length === 0 ? (
            <p className="text-sm text-steel">Todas las variantes tienen stock suficiente.</p>
          ) : (
            <ul className="divide-y divide-bone/10">
              {lowStock.map(({ p, v }) => (
                <li key={v.id}>
                  <Link href={`/admin/products/${p.id}`} className="flex justify-between py-3 text-sm hover:text-blood">
                    <span>{p.name} · {v.name}</span>
                    <span className={v.stock === 0 ? "text-blood" : "text-amber-300"}>{v.stock === 0 ? "Agotado" : `${v.stock} uds`}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
