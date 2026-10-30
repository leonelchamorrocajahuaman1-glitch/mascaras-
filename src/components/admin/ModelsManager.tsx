"use client";

import { useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { AlertTriangle, CheckCircle2, Eye, Link2, Loader2, Trash2, Unlink, Upload, X } from "lucide-react";
import type { ModelAsset } from "@/lib/types";
import { adminFetch, useFeedback } from "./feedback";
import { Card, EmptyState, btnGhost, btnPrimary, inputCls, labelCls } from "./ui";

const ModelViewer = dynamic(() => import("../three/ModelViewer").then((m) => m.ModelViewer), {
  ssr: false,
  loading: () => <div className="flex h-full items-center justify-center text-xs text-steel">Preparando visor…</div>,
});

interface ProductRef {
  id: string;
  name: string;
  slug: string;
  active: boolean;
  modelUrl: string | null;
}

type ModelWithState = ModelAsset & { missing: boolean };

function UploadPanel({ products, onDone, direct }: { products: ProductRef[]; onDone: () => void; direct: boolean }) {
  const { toast } = useFeedback();
  const input = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [progress, setProgress] = useState<number | null>(null);
  const [issues, setIssues] = useState<string[]>([]);
  const [meta, setMeta] = useState({ name: "", author: "", sourceUrl: "", license: "", productId: "" });

  /** Producción (Supabase): el navegador sube directamente a Storage con URLs firmadas; luego el servidor valida. */
  const submitDirect = async () => {
    setIssues([]);
    setProgress(0);
    try {
      const prep = await adminFetch<{ folder: string; main: string; uploads: { name: string; signedUrl: string }[] }>("/api/admin/models/direct", {
        method: "POST",
        json: { action: "prepare", files: files.map((f) => ({ name: f.name, size: f.size })) },
      });
      const total = files.reduce((t, f) => t + f.size, 0);
      let done = 0;
      for (const up of prep.uploads) {
        const file = files.find((f) => f.name === up.name)!;
        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open("PUT", up.signedUrl);
          xhr.setRequestHeader("content-type", file.name.endsWith(".glb") ? "model/gltf-binary" : file.type || "application/octet-stream");
          xhr.setRequestHeader("x-upsert", "false");
          xhr.upload.onprogress = (e) => e.lengthComputable && setProgress(Math.min(99, Math.round(((done + e.loaded) / total) * 100)));
          xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`Supabase Storage respondió ${xhr.status} al subir ${file.name}.`)));
          xhr.onerror = () => reject(new Error("No se pudo conectar con Supabase Storage."));
          xhr.send(file);
        });
        done += file.size;
      }
      setProgress(100);
      const res = await fetch("/api/admin/models/direct", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "complete", folder: prep.folder, main: prep.main, ...meta }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setIssues(data.issues ?? []);
        throw new Error(data.error ?? `Error ${res.status} al validar el modelo.`);
      }
      toast(`Modelo "${data.model?.name}" subido y validado${meta.productId ? " y asignado al producto" : ""}.`);
      setFiles([]);
      setMeta({ name: "", author: "", sourceUrl: "", license: "", productId: "" });
      if (input.current) input.current.value = "";
      onDone();
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setProgress(null);
    }
  };

  const submit = () => {
    if (!files.length) return toast("Selecciona un archivo .glb o .gltf.", "error");
    if (direct) return void submitDirect();
    const fd = new FormData();
    files.forEach((f) => fd.append("files", f));
    Object.entries(meta).forEach(([k, v]) => fd.append(k, v));
    setIssues([]);
    setProgress(0);
    // XMLHttpRequest para mostrar el progreso de subida de archivos grandes.
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/admin/models");
    xhr.upload.onprogress = (e) => e.lengthComputable && setProgress(Math.round((e.loaded / e.total) * 100));
    xhr.onload = () => {
      setProgress(null);
      let data: { error?: string; issues?: string[]; model?: ModelAsset } = {};
      try {
        data = JSON.parse(xhr.responseText);
      } catch {}
      if (xhr.status === 201) {
        toast(`Modelo "${data.model?.name}" subido y validado${meta.productId ? " y asignado al producto" : ""}.`);
        setFiles([]);
        setMeta({ name: "", author: "", sourceUrl: "", license: "", productId: "" });
        if (input.current) input.current.value = "";
        onDone();
      } else {
        setIssues(data.issues ?? []);
        toast(data.error ?? `Error ${xhr.status} al subir el modelo.`, "error");
      }
    };
    xhr.onerror = () => {
      setProgress(null);
      toast("No se pudo conectar con el servidor.", "error");
    };
    xhr.send(fd);
  };

  return (
    <Card className="space-y-4 p-6">
      <h2 className="flex items-center gap-2 font-display text-2xl font-black uppercase"><Upload size={18} className="text-blood" /> Subir modelo</h2>
      <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-bone/20 bg-black/30 px-4 py-8 text-center text-sm text-steel transition hover:border-blood hover:text-bone">
        <Upload size={20} />
        {files.length ? files.map((f) => `${f.name} (${(f.size / 1048576).toFixed(2)} MB)`).join(", ") : "Elige un .glb (o un .gltf con sus .bin y texturas)"}
        <input
          ref={input}
          type="file"
          multiple
          accept=".glb,.gltf,.bin,.png,.jpg,.jpeg,.webp,.ktx2,model/gltf-binary,model/gltf+json"
          className="sr-only"
          onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
        />
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-1.5"><span className={labelCls}>Nombre</span><input value={meta.name} onChange={(e) => setMeta({ ...meta, name: e.target.value })} placeholder="Automático según el archivo" className={inputCls} /></label>
        <label className="space-y-1.5"><span className={labelCls}>Autor</span><input value={meta.author} onChange={(e) => setMeta({ ...meta, author: e.target.value })} className={inputCls} /></label>
        <label className="space-y-1.5"><span className={labelCls}>Origen (URL)</span><input value={meta.sourceUrl} onChange={(e) => setMeta({ ...meta, sourceUrl: e.target.value })} placeholder="https://…" className={inputCls} /></label>
        <label className="space-y-1.5"><span className={labelCls}>Licencia</span><input value={meta.license} onChange={(e) => setMeta({ ...meta, license: e.target.value })} placeholder="p. ej. CC BY 4.0" className={inputCls} /></label>
      </div>
      <label className="block space-y-1.5">
        <span className={labelCls}>Asignar a producto (opcional)</span>
        <select value={meta.productId} onChange={(e) => setMeta({ ...meta, productId: e.target.value })} className={inputCls}>
          <option value="">— No asignar todavía —</option>
          {products.map((p) => <option key={p.id} value={p.id}>{p.name}{p.modelUrl ? " (reemplaza su modelo actual)" : ""}</option>)}
        </select>
      </label>
      {progress !== null && (
        <div className="space-y-1" role="status">
          <div className="h-1.5 overflow-hidden rounded-full bg-bone/10"><div className="h-full bg-blood transition-all" style={{ width: `${progress}%` }} /></div>
          <p className="text-xs text-steel">{progress < 100 ? `Subiendo… ${progress}%` : "Validando el modelo…"}</p>
        </div>
      )}
      {issues.length > 0 && (
        <ul role="alert" className="space-y-1 rounded-xl border border-blood/50 bg-blood/10 p-3 text-xs">
          {issues.map((i) => <li key={i}>✖ {i}</li>)}
        </ul>
      )}
      <button type="button" disabled={progress !== null} onClick={submit} className={btnPrimary}>
        {progress !== null ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />} Subir y validar
      </button>
      <p className="text-xs leading-relaxed text-steel">
        Máximo 60 MB. El archivo se comprueba antes de guardarse (formato glTF 2.0, integridad, mallas y extensiones). Registra siempre el autor y la licencia del modelo.
      </p>
    </Card>
  );
}

function ModelCard({ model, products, canWrite, onChange }: { model: ModelWithState; products: ProductRef[]; canWrite: boolean; onChange: () => void }) {
  const { toast, confirm } = useFeedback();
  const [view, setView] = useState(false);
  const [edit, setEdit] = useState(false);
  const [meta, setMeta] = useState({ name: model.name, author: model.author, sourceUrl: model.sourceUrl, license: model.license, rotationX: model.rotationX, rotationY: model.rotationY });
  const [assignTo, setAssignTo] = useState("");
  const [busy, setBusy] = useState(false);
  const users = products.filter((p) => p.modelUrl === model.url);
  const usable = model.valid && !model.missing;

  const run = async (fn: () => Promise<unknown>, ok: string) => {
    setBusy(true);
    try {
      await fn();
      toast(ok);
      onChange();
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="overflow-hidden">
      <div className="relative aspect-video bg-black/50">
        {view && usable ? (
          <ModelViewer key={`${meta.rotationX}-${meta.rotationY}`} model={{ url: model.url, name: meta.name, rotationX: meta.rotationX, rotationY: meta.rotationY }} label={`Vista 3D de ${model.name}`} className="absolute inset-0" />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-3 p-4 text-center">
            {usable ? (
              <button type="button" onClick={() => setView(true)} className={btnGhost}><Eye size={15} /> Ver en 3D</button>
            ) : (
              <p className="flex items-center gap-2 text-sm text-blood"><AlertTriangle size={16} /> {model.missing ? "El archivo ya no existe en public/models" : "Archivo no válido: no se puede mostrar"}</p>
            )}
          </div>
        )}
      </div>
      <div className="space-y-3 p-5 text-sm">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate font-display text-2xl font-black uppercase">{model.name}</p>
            <p className="truncate font-mono text-[11px] text-steel">{model.fileName} · {model.source === "public" ? "public/models" : model.source === "upload" ? "subido al panel" : "Supabase Storage"}</p>
          </div>
          <span className={`flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs ${usable ? "bg-emerald-500/15 text-emerald-300" : "bg-blood/15 text-blood"}`}>
            {usable ? <CheckCircle2 size={12} /> : <AlertTriangle size={12} />} {usable ? "Válido" : "Error"}
          </span>
        </div>
        <p className="text-xs text-steel">
          {model.stats.sizeMB ?? (model.sizeBytes / 1048576).toFixed(2)} MB · {model.stats.meshes ?? 0} mallas · {model.stats.materials?.length ?? 0} materiales · {model.stats.textures ?? 0} texturas
          {model.stats.extensions?.length ? ` · ${model.stats.extensions.join(", ")}` : ""}
        </p>
        {model.issues.map((i) => <p key={i} className="text-xs text-blood">✖ {i}</p>)}
        {model.warnings.map((w) => <p key={w} className="text-xs text-amber-300">⚠ {w}</p>)}

        {edit ? (
          <div className="grid gap-2 rounded-xl border border-bone/10 p-3 sm:grid-cols-2">
            <label className="space-y-1"><span className={labelCls}>Nombre</span><input value={meta.name} onChange={(e) => setMeta({ ...meta, name: e.target.value })} className={inputCls} /></label>
            <label className="space-y-1"><span className={labelCls}>Autor</span><input value={meta.author} onChange={(e) => setMeta({ ...meta, author: e.target.value })} className={inputCls} /></label>
            <label className="space-y-1"><span className={labelCls}>Origen (URL)</span><input value={meta.sourceUrl} onChange={(e) => setMeta({ ...meta, sourceUrl: e.target.value })} className={inputCls} /></label>
            <label className="space-y-1"><span className={labelCls}>Licencia</span><input value={meta.license} onChange={(e) => setMeta({ ...meta, license: e.target.value })} className={inputCls} /></label>
            <label className="space-y-1"><span className={labelCls}>Rotación X (°)</span><input type="number" step={15} value={meta.rotationX} onChange={(e) => setMeta({ ...meta, rotationX: Number(e.target.value) })} className={inputCls} /></label>
            <label className="space-y-1"><span className={labelCls}>Rotación Y (°)</span><input type="number" step={15} value={meta.rotationY} onChange={(e) => setMeta({ ...meta, rotationY: Number(e.target.value) })} className={inputCls} /></label>
            <div className="flex gap-2 sm:col-span-2">
              <button type="button" disabled={busy} className={btnPrimary} onClick={() => run(() => adminFetch(`/api/admin/models/${model.id}`, { method: "PATCH", json: meta }).then(() => setEdit(false)), "Datos del modelo guardados.")}>Guardar</button>
              <button type="button" className={btnGhost} onClick={() => setEdit(false)}><X size={14} /> Cancelar</button>
            </div>
            <p className="text-xs text-steel sm:col-span-2">Usa la rotación si el modelo aparece de espaldas (Y = 180) o tumbado (X = -90). Abre &quot;Ver en 3D&quot; para comprobarlo.</p>
          </div>
        ) : (
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
            <dt className="text-steel">Autor</dt><dd>{model.author || <span className="text-amber-300">no indicado</span>}</dd>
            <dt className="text-steel">Licencia</dt><dd>{model.license || <span className="text-amber-300">no indicada</span>}</dd>
            <dt className="text-steel">Origen</dt>
            <dd className="truncate">{model.sourceUrl ? <a href={model.sourceUrl} target="_blank" rel="noreferrer noopener" className="text-blood hover:underline">{model.sourceUrl}</a> : "—"}</dd>
          </dl>
        )}

        <div className="border-t border-bone/10 pt-3">
          <p className="mb-2 text-xs text-steel">Asignado a: {users.length ? users.map((u) => u.name).join(", ") : "ningún producto"}</p>
          {canWrite && (
            <div className="flex flex-wrap gap-2">
              {usable && (
                <>
                  <select aria-label="Producto al que asignar" value={assignTo} onChange={(e) => setAssignTo(e.target.value)} className="h-9 min-w-0 flex-1 rounded-full border border-bone/15 bg-black/40 px-3 text-xs">
                    <option value="">Asignar a producto…</option>
                    {products.filter((p) => p.modelUrl !== model.url).map((p) => <option key={p.id} value={p.id}>{p.name}{p.modelUrl ? " (cambia su modelo)" : ""}</option>)}
                  </select>
                  <button type="button" disabled={!assignTo || busy} className={btnGhost} onClick={() => run(() => adminFetch(`/api/admin/products/${assignTo}`, { method: "PATCH", json: { modelUrl: model.url } }).then(() => setAssignTo("")), "Modelo asignado. Ya se ve en la tienda.")}>
                    <Link2 size={13} /> Asignar
                  </button>
                </>
              )}
              {users.map((u) => (
                <button key={u.id} type="button" disabled={busy} className={btnGhost} onClick={() => run(() => adminFetch(`/api/admin/products/${u.id}`, { method: "PATCH", json: { modelUrl: null } }), `Modelo quitado de "${u.name}" (el producto se conserva).`)}>
                  <Unlink size={13} /> Quitar de {u.name}
                </button>
              ))}
              {!edit && <button type="button" className={btnGhost} onClick={() => setEdit(true)}>Editar datos</button>}
              <button
                type="button"
                disabled={busy}
                className={`${btnGhost} hover:border-blood hover:text-blood`}
                onClick={async () => {
                  const ok = await confirm({
                    title: `Eliminar "${model.name}"`,
                    body: `${users.length ? `Se quitará de ${users.length} producto(s), que se conservan sin modelo. ` : ""}${model.source === "public" ? "El archivo está en public/models: bórralo también de esa carpeta o se volverá a registrar." : "Se borrarán también sus archivos."}`,
                    confirmLabel: "Eliminar modelo",
                    danger: true,
                  });
                  if (ok) run(() => adminFetch(`/api/admin/models/${model.id}`, { method: "DELETE" }), "Modelo eliminado.");
                }}
              >
                <Trash2 size={13} /> Eliminar
              </button>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

export function ModelsManager({ models, products, canWrite, direct = false }: { models: ModelWithState[]; products: ProductRef[]; canWrite: boolean; direct?: boolean }) {
  const router = useRouter();
  const refresh = () => router.refresh();
  const valid = new Set(models.filter((m) => m.valid && !m.missing).map((m) => m.url));
  const withModel = products.filter((p) => p.modelUrl && valid.has(p.modelUrl));
  const broken = products.filter((p) => p.modelUrl && !valid.has(p.modelUrl));
  const without = products.filter((p) => !p.modelUrl);

  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-[1fr_1.2fr]">
        {canWrite ? <UploadPanel products={products} onDone={refresh} direct={direct} /> : <Card className="p-6 text-sm text-steel">Tu rol puede ver los modelos pero no subirlos ni asignarlos.</Card>}
        <Card className="p-6">
          <h2 className="mb-4 font-display text-2xl font-black uppercase">Cobertura 3D</h2>
          <div className="mb-4 grid grid-cols-3 gap-3 text-center">
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3"><p className="font-display text-3xl font-black">{withModel.length}</p><p className="text-xs text-emerald-300">Con modelo</p></div>
            <div className="rounded-xl border border-bone/10 p-3"><p className="font-display text-3xl font-black">{without.length}</p><p className="text-xs text-steel">Sin modelo</p></div>
            <div className="rounded-xl border border-blood/30 bg-blood/10 p-3"><p className="font-display text-3xl font-black">{broken.length}</p><p className="text-xs text-blood">Modelo roto</p></div>
          </div>
          <ul className="max-h-[300px] divide-y divide-bone/5 overflow-y-auto text-sm">
            {[...broken.map((p) => ({ p, s: "broken" })), ...without.map((p) => ({ p, s: "none" })), ...withModel.map((p) => ({ p, s: "ok" }))].map(({ p, s }) => (
              <li key={p.id} className="flex items-center justify-between gap-3 py-2">
                <span className="min-w-0 truncate">{p.name}{!p.active && <span className="text-steel"> · oculto</span>}</span>
                <span className={`shrink-0 text-xs ${s === "ok" ? "text-emerald-300" : s === "broken" ? "text-blood" : "text-steel"}`}>
                  {s === "ok" ? models.find((m) => m.url === p.modelUrl)?.name : s === "broken" ? "archivo no válido o borrado" : "sin modelo 3D"}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      {models.length === 0 ? (
        <EmptyState title="Aún no hay modelos 3D">
          Sube aquí tus archivos .glb, o cópialos en la carpeta <code className="text-bone">public/models</code> del proyecto: se registrarán automáticamente al abrir esta página.
        </EmptyState>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2 2xl:grid-cols-3">
          {models.map((m) => <ModelCard key={m.id} model={m} products={products} canWrite={canWrite} onChange={refresh} />)}
        </div>
      )}
    </div>
  );
}
