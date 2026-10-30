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
            ? "Esta web publicada no tiene almacenamiento conectado (Vercel no guarda archivos y corta envíos de más de ~4,5 MB), así que no se puede subir desde aquí. Forma más fácil, sin instalar nada: en GitHub abre tu repositorio → Releases → Draft a new release → escribe una etiqueta (p. ej. modelos-1) → arrastra tus .glb (hasta 2 GB) → Publish release. En 2-4 minutos aparecerán aquí y en la tienda, asignados según public/models/models.json. Alternativa: conectar Supabase (docs/DESPLIEGUE-VERCEL.md)."
            : null
        }
      />
    </>
  );
}
