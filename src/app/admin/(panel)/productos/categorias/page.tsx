import { db } from "@/lib/db";
import { requirePagePermission } from "@/lib/auth/server";
import { can } from "@/lib/auth/permissions";
import { PageHeader } from "@/components/admin/ui";
import { ProductsTabs } from "@/components/admin/ProductsTabs";
import { CategoriesManager } from "@/components/admin/CategoriesManager";

export const metadata = { title: "Categorías" };

export default async function CategoriesPage() {
  const session = await requirePagePermission("products:view");
  const [categories, products] = await Promise.all([db().listCategories({ includeInactive: true }), db().listProducts({ includeInactive: true })]);
  const usage: Record<string, number> = {};
  for (const p of products) usage[p.category] = (usage[p.category] ?? 0) + 1;
  return (
    <>
      <PageHeader kicker="Catálogo" title="Categorías" subtitle={`${categories.length} categorías`} />
      <ProductsTabs />
      <CategoriesManager categories={categories} usage={usage} canWrite={can(session.role, "categories:write")} />
    </>
  );
}
