import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { AdminShell } from "@/components/admin/AdminShell";
import { syncPublicModels } from "@/lib/models";

export const dynamic = "force-dynamic";

/** Segunda barrera (además del proxy): sesión verificada contra la base de datos en el servidor. */
export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");
  await syncPublicModels().catch((err) => console.error("No se pudieron sincronizar los modelos 3D:", err));
  const repo = db();
  const [orders, products, settings] = await Promise.all([repo.listOrders(), repo.listProducts({ includeInactive: true }), repo.getSettings()]);
  const alerts = {
    pendingOrders: orders.filter((o) => o.status === "pending" && !o.isTest).length,
    lowStock: products.filter((p) => p.active).flatMap((p) => p.variants).filter((v) => v.stock <= settings.lowStockThreshold).length,
  };
  return (
    <AdminShell session={{ email: session.email, name: session.name, role: session.role }} dbKind={repo.kind} alerts={alerts}>
      {children}
    </AdminShell>
  );
}
