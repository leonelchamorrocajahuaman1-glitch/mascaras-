import Link from "next/link";
import { PageHeader } from "@/components/admin/ui";
import { ProductForm } from "@/components/admin/ProductForm";

export const metadata = { title: "Nuevo producto" };

export default function NewProductPage() {
  return (
    <>
      <Link href="/admin/products" className="text-sm text-steel hover:text-bone">← Productos</Link>
      <div className="mt-4"><PageHeader title="Nuevo producto" /></div>
      <ProductForm />
    </>
  );
}
