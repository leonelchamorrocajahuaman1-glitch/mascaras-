import { listModels } from "@/lib/models";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/admin/ui";
import { ProductForm } from "@/components/admin/ProductForm";

export const metadata = { title: "Editar producto" };

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const product = await db().getProductById((await params).id);
  if (!product) notFound();
  return (
    <>
      <Link href="/admin/products" className="text-sm text-steel hover:text-bone">← Productos</Link>
      <div className="mt-4">
        <PageHeader
          title={product.name}
          subtitle={`ID ${product.id}`}
          actions={product.active ? <a href={`/shop/${product.slug}`} target="_blank" rel="noreferrer" className="text-sm text-steel hover:text-bone">Ver en la tienda ↗</a> : null}
        />
      </div>
      <ProductForm product={product} models={listModels().map((m) => ({ url: m.url, name: m.name, ok: m.ok }))} />
    </>
  );
}
