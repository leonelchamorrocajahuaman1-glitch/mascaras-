import { CreditCard, Database, ShieldCheck } from "lucide-react";
import { db, isSupabaseConfigured } from "@/lib/db";
import { requirePagePermission } from "@/lib/auth/server";
import { can } from "@/lib/auth/permissions";
import { publicUser } from "@/lib/admin-users";
import { ADMIN_ROLE_LABEL } from "@/lib/types";
import { Card, PageHeader } from "@/components/admin/ui";
import { SettingsForm } from "@/components/admin/SettingsForm";
import { UsersManager } from "@/components/admin/UsersManager";
import { TestDataCleanup } from "@/components/admin/TestDataCleanup";

export const metadata = { title: "Configuración" };

export default async function SettingsPage() {
  const session = await requirePagePermission("dashboard:view");
  const repo = db();
  const isOwner = can(session.role, "users:manage");
  const [settings, users, orders] = await Promise.all([repo.getSettings(), isOwner ? repo.listAdminUsers() : Promise.resolve([]), repo.listOrders()]);

  return (
    <>
      <PageHeader kicker="Sistema" title="Configuración" subtitle={`Sesión: ${session.email} · ${ADMIN_ROLE_LABEL[session.role]}`} />
      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <SettingsForm settings={settings} canWrite={can(session.role, "settings:write")} />
        <div className="space-y-6">
          <Card className="space-y-3 p-6 text-sm">
            <h2 className="flex items-center gap-2 font-display text-2xl font-black uppercase"><CreditCard size={18} className="text-blood" /> Pagos</h2>
            <p className="text-bone/80"><strong>Pasarela en línea: no configurada.</strong> La web no cobra ni guarda datos de tarjeta. Los pedidos se registran como &quot;No pagado&quot;.</p>
            <p className="text-steel">Cuando recibas un pago por otro medio, regístralo en la ficha del pedido. Para cobrar en línea habría que integrar una pasarela (por ejemplo Stripe) que confirme el pago mediante un webhook firmado.</p>
          </Card>
          <Card className="space-y-3 p-6 text-sm">
            <h2 className="flex items-center gap-2 font-display text-2xl font-black uppercase"><Database size={18} className="text-blood" /> Base de datos</h2>
            <p>{isSupabaseConfigured() ? "Supabase (PostgreSQL) — producción." : "Local: data/db.json — tienda y panel comparten este archivo."}</p>
            <p className="text-steel">Las claves privadas (service role, secreto de sesión, hash del propietario) solo se leen en el servidor desde .env.local.</p>
          </Card>
          <Card className="space-y-3 p-6 text-sm">
            <h2 className="flex items-center gap-2 font-display text-2xl font-black uppercase"><ShieldCheck size={18} className="text-blood" /> Seguridad</h2>
            <ul className="list-disc space-y-1 pl-5 text-steel">
              <li>Contraseñas con hash scrypt; nunca en texto plano.</li>
              <li>Sesión firmada en cookie httpOnly (8 h) y verificada en el servidor en cada petición.</li>
              <li>Permisos por rol comprobados en cada ruta de la API.</li>
              <li>Límite de 5 intentos de acceso cada 15 minutos.</li>
            </ul>
            {can(session.role, "orders:cleanup") && (
              <div className="border-t border-bone/10 pt-3">
                <p className="mb-2 text-steel">Pedidos de prueba (emails @spidermasks.test): se excluyen de las estadísticas.</p>
                <TestDataCleanup count={orders.filter((o) => o.isTest).length} />
              </div>
            )}
          </Card>
        </div>
      </div>
      {isOwner && (
        <div className="mt-6">
          <UsersManager users={users.map(publicUser)} ownerEmail={process.env.ADMIN_EMAIL ?? ""} />
        </div>
      )}
    </>
  );
}
