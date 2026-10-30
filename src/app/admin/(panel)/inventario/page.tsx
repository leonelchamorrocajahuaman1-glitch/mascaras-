import { db } from "@/lib/db";
import { requirePagePermission } from "@/lib/auth/server";
import { can } from "@/lib/auth/permissions";
import { PageHeader, StatCard } from "@/components/admin/ui";
import { InventoryManager, type InventoryRow } from "@/components/admin/InventoryManager";

export const metadata = { title: "Inventario" };

export default async function InventoryPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const session = await requirePagePermission("inventory:view");
  const { q } = await searchParams;
  const repo = db();
  const [products, movements, settings] = await Promise.all([repo.listProducts({ includeInactive: true }), repo.listMovements({ limit: 300 }), repo.getSettings()]);
  const rows: InventoryRow[] = products.flatMap((p) =>
    p.variants.map((v) => ({ variantId: v.id, productId: p.id, productName: p.name, productActive: p.active, variantName: v.name, sku: v.sku, stock: v.stock })),
  );
  const units = rows.reduce((s, r) => s + r.stock, 0);
  const low = rows.filter((r) => r.stock > 0 && r.stock <= settings.lowStockThreshold).length;
  const out = rows.filter((r) => r.stock <= 0).length;
  return (
    <>
      <PageHeader kicker="Operaciones" title="Inventario" subtitle="Las ventas descuentan stock al registrarse el pedido; cancelar lo repone. Nunca se vende por encima del stock." />
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Unidades en stock" value={units} />
        <StatCard label="Variantes" value={rows.length} />
        <StatCard label="Stock bajo" value={low} hint={`≤ ${settings.lowStockThreshold} uds (configurable)`} accent={low > 0} />
        <StatCard label="Agotadas" value={out} accent={out > 0} />
      </div>
      <InventoryManager rows={rows} movements={movements} threshold={settings.lowStockThreshold} canAdjust={can(session.role, "inventory:adjust")} initialQuery={q ?? ""} />
    </>
  );
}
