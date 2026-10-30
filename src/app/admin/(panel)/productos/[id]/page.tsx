import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requirePagePermission } from "@/lib/auth/server";
import { listModelAssets } from "@/lib/models";
import { formatDate } from "@/lib/format";
import { STOCK_REASON_LABEL } from "@/lib/types";
import { Card, PageHeader } from "@/components/admin/ui";
import { ProductForm } from "@/components/admin/ProductForm";

export const metadata = { title: "Editar producto" };

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePagePermission("products:write");
  const { id } = await params;
  const repo = db();
  const [product, categories, models, movements] = await Promise.all([repo.getProductById(id), repo.listCategories({ includeInactive: true }), listModelAssets(), repo.listMovements({ productId: id, limit: 15 })]);
  if (!product) notFound();
  return (
    <>
      <Link href="/admin/productos" className="text-sm text-steel hover:text-bone">← Productos</Link>
      <div className="mt-4">
        <PageHeader
          kicker="Catálogo"
          title={product.name}
          subtitle={`Actualizado ${formatDate(product.updatedAt)} · ID ${product.id}`}
          actions={product.active ? <a href={`/shop/${product.slug}`} target="_blank" rel="noreferrer" className="text-sm text-steel hover:text-bone">Ver en la tienda ↗</a> : <span className="text-sm text-amber-300">Oculto en la tienda</span>}
        />
      </div>
      <ProductForm product={product} categories={categories} models={models.map((m) => ({ url: m.url, name: m.name, ok: m.valid }))} />
      <Card className="mt-6 p-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-2xl font-black uppercase">Últimos movimientos de stock</h2>
          <Link href={`/admin/inventario?q=${encodeURIComponent(product.slug)}`} className="text-sm text-steel hover:text-bone">Inventario →</Link>
        </div>
        {movements.length === 0 ? (
          <p className="text-sm text-steel">Sin movimientos registrados.</p>
        ) : (
          <ul className="divide-y divide-bone/5 text-sm">
            {movements.map((m) => (
              <li key={m.id} className="flex flex-wrap justify-between gap-2 py-2">
                <span>{m.variantName} · {STOCK_REASON_LABEL[m.reason]}{m.note ? ` · ${m.note}` : ""}</span>
                <span className="text-steel">
                  <span className={m.delta > 0 ? "text-emerald-300" : "text-blood"}>{m.delta > 0 ? "+" : ""}{m.delta}</span> → {m.stockAfter} · {m.actor} · {formatDate(m.createdAt)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
