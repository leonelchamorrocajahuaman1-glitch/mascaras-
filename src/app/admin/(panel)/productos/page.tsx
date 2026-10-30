import Link from "next/link";
import { Plus } from "lucide-react";
import { db } from "@/lib/db";
import { requirePagePermission } from "@/lib/auth/server";
import { can } from "@/lib/auth/permissions";
import { productImage } from "@/lib/assets";
import { PageHeader, btnPrimary } from "@/components/admin/ui";
import { ProductsManager } from "@/components/admin/ProductsManager";
import { ProductsTabs } from "@/components/admin/ProductsTabs";
import { SeedButton } from "@/components/admin/SeedButton";

export const metadata = { title: "Productos" };

export default async function ProductsPage() {
  const session = await requirePagePermission("products:view");
  const repo = db();
  const [products, categories, settings] = await Promise.all([repo.listProducts({ includeInactive: true }), repo.listCategories({ includeInactive: true }), repo.getSettings()]);
  const images = Object.fromEntries(products.map((p) => [p.id, productImage(p)]));
  const canWrite = can(session.role, "products:write");
  return (
    <>
      <PageHeader
        kicker="Catálogo"
        title="Productos"
        subtitle={`${products.length} productos · los cambios se reflejan al instante en la tienda`}
        actions={canWrite ? <Link href="/admin/productos/nuevo" className={btnPrimary}><Plus size={15} /> Nuevo producto</Link> : null}
      />
      <ProductsTabs />
      {products.length === 0 && canWrite ? (
        <SeedButton />
      ) : (
        <ProductsManager products={products} categories={categories} images={images} lowStock={settings.lowStockThreshold} canWrite={canWrite} canDelete={can(session.role, "products:delete")} />
      )}
    </>
  );
}
