import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { AdminNav } from "@/components/admin/AdminNav";

export const dynamic = "force-dynamic";

/** Segunda barrera de autorización (además del proxy): se verifica la sesión en el servidor. */
export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const session = await getAdminSession().catch(() => null);
  if (!session) redirect("/admin/login");
  return (
    <div className="lg:flex">
      <AdminNav email={session.sub} dbKind={db().kind} />
      <main className="min-w-0 flex-1 p-5 lg:p-10">{children}</main>
    </div>
  );
}
