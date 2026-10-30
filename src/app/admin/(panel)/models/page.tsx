import Link from "next/link";
import { db } from "@/lib/db";
import { listModels } from "@/lib/models";
import { Card, PageHeader } from "@/components/admin/ui";
import { AdminModelPreview } from "@/components/admin/AdminModelPreview";

export const metadata = { title: "Modelos 3D" };

export default async function ModelsPage() {
  const models = listModels();
  const products = await db().listProducts({ includeInactive: true });
  return (
    <>
      <PageHeader title="Modelos 3D" subtitle="Archivos .glb / .gltf detectados en public/models" />
      {models.length === 0 ? (
        <Card className="space-y-3 p-6 text-sm leading-relaxed text-bone/80">
          <p>No hay modelos todavía.</p>
          <ol className="list-decimal space-y-1 pl-5 text-steel">
            <li>Descarga el modelo en formato GLB (o GLTF con sus .bin y texturas).</li>
            <li>Renómbralo sin espacios ni tildes, por ejemplo <code className="text-bone">mascara-clasica.glb</code>.</li>
            <li>Cópialo en la carpeta <code className="text-bone">public/models/</code> del proyecto.</li>
            <li>Ejecuta <code className="text-bone">npm run models:check</code> y recarga esta página.</li>
            <li>Asígnalo a un producto en Productos → editar → &quot;Modelo 3D (GLB real)&quot;.</li>
          </ol>
        </Card>
      ) : (
        <div className="grid gap-6 xl:grid-cols-2">
          {models.map((m) => {
            const users = products.filter((p) => p.modelUrl === m.url);
            const { stats, issues, warnings } = m.inspection;
            return (
              <Card key={m.url} className="overflow-hidden">
                {m.ok ? (
                  <AdminModelPreview model={{ url: m.url, name: m.name, rotationY: m.rotationY ?? 0, rotationX: m.rotationX ?? 0 }} />
                ) : (
                  <div className="flex aspect-video items-center justify-center bg-ink text-sm text-blood">Archivo con errores: no se puede previsualizar</div>
                )}
                <div className="space-y-3 p-5 text-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-display text-2xl font-black uppercase">{m.name}</p>
                      <p className="font-mono text-xs text-steel">{decodeURIComponent(m.url)}</p>
                    </div>
                    <span className={`rounded-full px-2.5 py-1 text-xs ${m.ok ? "bg-emerald-500/15 text-emerald-300" : "bg-blood/15 text-blood"}`}>{m.ok ? "Válido" : "Error"}</span>
                  </div>
                  <p className="text-steel">
                    {stats.sizeMB} MB · {stats.meshes} mallas · {stats.materials.length} materiales · {stats.textures} texturas
                    {stats.extensions.length ? ` · ${stats.extensions.join(", ")}` : ""}
                  </p>
                  <p className="text-steel">
                    Autor: <span className="text-bone">{m.author ?? "no indicado"}</span> · Licencia:{" "}
                    <span className={m.license ? "text-bone" : "text-amber-300"}>{m.license ?? "no indicada"}</span>
                    {m.sourceUrl && (
                      <>
                        {" · "}
                        <a href={m.sourceUrl} target="_blank" rel="noreferrer noopener" className="text-blood hover:underline">origen</a>
                      </>
                    )}
                  </p>
                  {issues.map((i) => <p key={i} className="text-blood">✖ {i}</p>)}
                  {warnings.map((w) => <p key={w} className="text-amber-300">⚠ {w}</p>)}
                  <p className="text-steel">
                    Usado por:{" "}
                    {users.length
                      ? users.map((u, i) => (
                          <span key={u.id}>
                            {i > 0 && ", "}
                            <Link href={`/admin/products/${u.id}`} className="text-bone hover:text-blood">{u.name}</Link>
                          </span>
                        ))
                      : "ningún producto"}
                  </p>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
