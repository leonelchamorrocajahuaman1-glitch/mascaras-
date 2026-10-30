import Link from "next/link";
import { db } from "@/lib/db";
import { requirePagePermission } from "@/lib/auth/server";
import { listModelAssets } from "@/lib/models";
import { PageHeader } from "@/components/admin/ui";
import { ProductForm } from "@/components/admin/ProductForm";

export const metadata = { title: "Nuevo producto" };
export const dynamic = "force-dynamic";

export default async function NewProductPage() {
  await requirePagePermission("products:write");
  const [categories, models] = await Promise.all([db().listCategories({ includeInactive: true }), listModelAssets()]);
  return (
    <>
      <Link href="/admin/productos" className="text-sm text-steel hover:text-bone">← Productos</Link>
      <div className="mt-4"><PageHeader kicker="Catálogo" title="Nuevo producto" /></div>
      <ProductForm categories={categories} models={models.map((m) => ({ url: m.url, name: m.name, ok: m.valid }))} />
    </>
  );
}
