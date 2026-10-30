import Link from "next/link";
import { AlertTriangle, Box, CalendarDays, DollarSign, PackageCheck, PackageX, Receipt, TrendingUp } from "lucide-react";
import { db } from "@/lib/db";
import { requirePagePermission } from "@/lib/auth/server";
import { computeStats } from "@/lib/stats";
import { formatDate, formatMoney } from "@/lib/format";
import { Card, EmptyState, PageHeader, PaymentBadge, StatCard, StatusBadge } from "@/components/admin/ui";
import { SalesChart } from "@/components/admin/SalesChart";
import { SeedButton } from "@/components/admin/SeedButton";

export const metadata = { title: "Dashboard" };

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ denegado?: string }> }) {
  const session = await requirePagePermission("dashboard:view");
  const { denegado } = await searchParams;
  const repo = db();
  const [orders, products, settings] = await Promise.all([repo.listOrders(), repo.listProducts({ includeInactive: true }), repo.getSettings()]);
  const s = computeStats(orders, products, settings);

  return (
    <>
      <PageHeader kicker="Control center" title="Dashboard" subtitle={`Hola, ${session.name || session.email}. Datos en tiempo real de la base de datos.`} />

      {denegado && (
        <p role="alert" className="mb-6 rounded-xl border border-blood/50 bg-blood/10 px-4 py-3 text-sm">
          Tu rol no tiene acceso a esa sección.
        </p>
      )}
      {!settings.ordersEnabled && (
        <p className="mb-6 flex items-center gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          <AlertTriangle size={16} /> Los pedidos están pausados en la tienda. Actívalos en Configuración.
        </p>
      )}
      {products.length === 0 && (
        <Card className="mb-6 flex flex-wrap items-center justify-between gap-4 p-6">
          <p className="text-sm text-bone/80">No hay productos todavía. Crea uno o importa el catálogo inicial.</p>
          <SeedButton />
        </Card>
      )}

      <section aria-label="Ventas" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard accent label="Ventas totales" value={formatMoney(s.totalSalesCents)} hint="Importe de pedidos no cancelados" icon={<TrendingUp size={16} />} />
        <StatCard label="Ingresos de hoy" value={formatMoney(s.todayCents)} hint={`${s.ordersToday} pedido(s) hoy`} icon={<CalendarDays size={16} />} />
        <StatCard label="Ingresos del mes" value={formatMoney(s.monthCents)} hint="Mes en curso" icon={<CalendarDays size={16} />} />
        <StatCard label="Cobrado" value={formatMoney(s.collectedCents)} hint="Pagos confirmados (sin pasarela en línea)" icon={<DollarSign size={16} />} />
      </section>

      <section aria-label="Operación" className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Pedidos" value={s.ordersCount} hint={`${s.pendingOrders} pendientes · ${s.cancelledOrders} cancelados`} icon={<Receipt size={16} />} />
        <StatCard label="Productos disponibles" value={s.productsAvailable} hint={`${s.productsActive} activos · ${s.productsInactive} ocultos`} icon={<PackageCheck size={16} />} />
        <StatCard label="Stock bajo" value={s.lowStock.length} hint={`Variantes con ≤ ${settings.lowStockThreshold} uds`} icon={<AlertTriangle size={16} />} />
        <StatCard label="Agotados" value={s.outOfStock.length} hint="Variantes sin existencias" icon={<PackageX size={16} />} />
      </section>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <Card className="p-6">
          <div className="mb-4 flex items-baseline justify-between gap-4">
            <h2 className="font-display text-2xl font-black uppercase">Ventas</h2>
            <span className="text-xs text-steel">Pedidos no cancelados · sin pedidos de prueba</span>
          </div>
          <SalesChart daily={s.daily} monthly={s.monthly} />
        </Card>

        <Card className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-2xl font-black uppercase">Alertas de stock</h2>
            <Link href="/admin/inventario" className="text-sm text-steel hover:text-bone">Inventario →</Link>
          </div>
          {s.outOfStock.length + s.lowStock.length === 0 ? (
            <p className="text-sm text-steel">Todas las variantes activas tienen stock suficiente.</p>
          ) : (
            <ul className="max-h-[320px] divide-y divide-bone/10 overflow-y-auto">
              {[...s.outOfStock, ...s.lowStock].map(({ product, variant }) => (
                <li key={variant.id}>
                  <Link href={`/admin/inventario?q=${encodeURIComponent(variant.sku)}`} className="flex items-center justify-between gap-3 py-2.5 text-sm hover:text-blood">
                    <span className="min-w-0 truncate">
                      {product.name} <span className="text-steel">· {variant.name}</span>
                    </span>
                    <span className={variant.stock <= 0 ? "text-blood" : "text-amber-300"}>{variant.stock <= 0 ? "Agotado" : `${variant.stock} uds`}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          {s.productsWithoutModel > 0 && (
            <Link href="/admin/modelos-3d" className="mt-4 flex items-center gap-2 rounded-xl border border-bone/10 px-3 py-2 text-xs text-steel hover:text-bone">
              <Box size={13} className="text-blood" /> {s.productsWithoutModel} producto(s) sin modelo 3D asignado
            </Link>
          )}
        </Card>
      </div>

      <Card className="mt-6 p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-2xl font-black uppercase">Últimos pedidos</h2>
          <Link href="/admin/pedidos" className="text-sm text-steel hover:text-bone">Ver todos →</Link>
        </div>
        {s.recent.length === 0 ? (
          <EmptyState title="Sin pedidos todavía">Los pedidos aparecerán aquí en cuanto un cliente compre en la tienda.</EmptyState>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="font-mono text-[10px] uppercase tracking-[0.2em] text-steel">
                <tr>
                  <th className="py-2 font-normal">Pedido</th>
                  <th className="py-2 font-normal">Cliente</th>
                  <th className="py-2 font-normal">Fecha</th>
                  <th className="py-2 font-normal">Estado</th>
                  <th className="py-2 font-normal">Pago</th>
                  <th className="py-2 text-right font-normal">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-bone/5">
                {s.recent.map((o) => (
                  <tr key={o.id} className="hover:bg-bone/[0.02]">
                    <td className="py-2.5"><Link href={`/admin/pedidos/${o.id}`} className="font-medium hover:text-blood">#{o.number}</Link></td>
                    <td className="py-2.5">{o.customer.name}</td>
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
    </>
  );
}
