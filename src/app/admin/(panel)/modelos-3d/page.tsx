import { db, isReadOnlyDeployment, isSupabaseConfigured } from "@/lib/db";
import { requirePagePermission } from "@/lib/auth/server";
import { can } from "@/lib/auth/permissions";
import { listModelAssets, modelFileMissing } from "@/lib/models";
import { PageHeader } from "@/components/admin/ui";
import { ModelsManager } from "@/components/admin/ModelsManager";

export const metadata = { title: "Modelos 3D" };
export const dynamic = "force-dynamic";

export default async function Models3DPage() {
  const session = await requirePagePermission("models:view");
  const [models, products] = await Promise.all([listModelAssets(), db().listProducts({ includeInactive: true })]);
  return (
    <>
      <PageHeader kicker="Catálogo" title="Modelos 3D" subtitle={`${models.length} modelo(s) registrados · GLB / GLTF`} />
      <ModelsManager
        models={models.map((m) => ({ ...m, missing: modelFileMissing(m) }))}
        products={products.map((p) => ({ id: p.id, name: p.name, slug: p.slug, active: p.active, modelUrl: p.modelUrl }))}
        canWrite={can(session.role, "models:write")}
        direct={isSupabaseConfigured()}
        uploadBlocked={
          isReadOnlyDeployment()
            ? "La web publicada está en modo de solo lectura: falta conectar Supabase. Vercel no puede guardar archivos y solo admite envíos de unos 4,5 MB, así que los modelos se suben directamente a Supabase Storage (hasta 50 MB por archivo en el plan gratuito). Añade NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en Vercel y vuelve a desplegar (ver docs/DESPLIEGUE-VERCEL.md)."
            : null
        }
      />
    </>
  );
}
