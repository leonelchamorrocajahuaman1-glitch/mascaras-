import Link from "next/link";
import { Plus } from "lucide-react";
import { db } from "@/lib/db";
import { productImage } from "@/lib/assets";
import { PageHeader } from "@/components/admin/ui";
import { ProductTable } from "@/components/admin/ProductTable";
import { SeedButton } from "@/components/admin/SeedButton";

export const metadata = { title: "Productos" };

export default async function ProductsPage() {
  const products = await db().listProducts({ includeInactive: true });
  const images = Object.fromEntries(products.map((p) => [p.id, productImage(p)]));
  return (
    <>
      <PageHeader
        title="Productos"
        subtitle={`${products.length} productos en el catálogo`}
        actions={
          <Link href="/admin/products/new" className="flex items-center gap-2 rounded-full bg-blood px-5 py-2.5 text-sm text-white hover:bg-ember">
            <Plus size={15} /> Nuevo producto
          </Link>
        }
      />
      {products.length ? <ProductTable products={products} images={images} /> : <SeedButton />}
    </>
  );
}
