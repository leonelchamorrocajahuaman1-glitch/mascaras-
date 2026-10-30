"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Pencil, Plus, Trash2, X } from "lucide-react";
import { slugify } from "@/lib/format";
import type { Category } from "@/lib/types";
import { adminFetch, useFeedback } from "./feedback";
import { Card, btnGhost, btnPrimary, inputCls, labelCls } from "./ui";

type Draft = { slug: string; name: string; description: string; sortOrder: number; active: boolean };
const empty: Draft = { slug: "", name: "", description: "", sortOrder: 0, active: true };

export function CategoriesManager({ categories, usage, canWrite }: { categories: Category[]; usage: Record<string, number>; canWrite: boolean }) {
  const router = useRouter();
  const { toast, confirm } = useFeedback();
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(empty);
  const [creating, setCreating] = useState<Draft>({ ...empty, sortOrder: categories.length });
  const [busy, setBusy] = useState(false);

  const save = async (url: string, method: "POST" | "PUT", body: Draft, done: string) => {
    if (body.name.trim().length < 2) return toast("El nombre debe tener al menos 2 caracteres.", "error");
    setBusy(true);
    try {
      await adminFetch(url, { method, json: { ...body, slug: body.slug || slugify(body.name) } });
      toast(done);
      setEditing(null);
      setCreating({ ...empty, sortOrder: categories.length + 1 });
      router.refresh();
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (c: Category) => {
    if (usage[c.slug]) return toast(`No se puede eliminar: ${usage[c.slug]} producto(s) la usan. Muévelos antes a otra categoría.`, "error");
    if (!(await confirm({ title: `Eliminar "${c.name}"`, body: "La categoría dejará de existir. Esta acción no se puede deshacer.", confirmLabel: "Eliminar", danger: true }))) return;
    setBusy(true);
    try {
      await adminFetch(`/api/admin/categories/${c.id}`, { method: "DELETE" });
      toast("Categoría eliminada.");
      router.refresh();
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
      <div className="overflow-x-auto rounded-2xl border border-bone/10 bg-white/[0.02]">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b border-bone/10 font-mono text-[10px] uppercase tracking-[0.2em] text-steel">
            <tr>
              <th className="px-4 py-3 font-normal">Orden</th>
              <th className="px-4 py-3 font-normal">Categoría</th>
              <th className="px-4 py-3 font-normal">Productos</th>
              <th className="px-4 py-3 font-normal">Visible</th>
              <th className="px-4 py-3 font-normal"><span className="sr-only">Acciones</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-bone/5">
            {categories.map((c) =>
              editing === c.id ? (
                <tr key={c.id} className="bg-bone/[0.03]">
                  <td className="px-4 py-3"><input type="number" min={0} aria-label="Orden" value={draft.sortOrder} onChange={(e) => setDraft({ ...draft, sortOrder: Number(e.target.value) })} className={`${inputCls} w-20`} /></td>
                  <td className="space-y-2 px-4 py-3">
                    <input aria-label="Nombre" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} className={inputCls} />
                    <input aria-label="Slug" value={draft.slug} onChange={(e) => setDraft({ ...draft, slug: slugify(e.target.value) })} className={`${inputCls} font-mono`} />
                    <input aria-label="Descripción" value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} placeholder="Descripción" className={inputCls} />
                  </td>
                  <td className="px-4 py-3 tabular-nums">{usage[c.slug] ?? 0}</td>
                  <td className="px-4 py-3"><input type="checkbox" aria-label="Visible" checked={draft.active} onChange={(e) => setDraft({ ...draft, active: e.target.checked })} className="h-4 w-4 accent-[#e1121f]" /></td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button type="button" disabled={busy} onClick={() => save(`/api/admin/categories/${c.id}`, "PUT", draft, "Categoría actualizada.")} className="rounded-full border border-emerald-500/40 p-2 text-emerald-300" aria-label="Guardar"><Check size={14} /></button>
                      <button type="button" onClick={() => setEditing(null)} className="rounded-full border border-bone/15 p-2" aria-label="Cancelar"><X size={14} /></button>
                    </div>
                  </td>
                </tr>
              ) : (
                <tr key={c.id} className="hover:bg-bone/[0.02]">
                  <td className="px-4 py-3 tabular-nums text-steel">{c.sortOrder}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium">{c.name}</p>
                    <p className="font-mono text-[10px] text-steel">/{c.slug}{c.description ? ` · ${c.description}` : ""}</p>
                  </td>
                  <td className="px-4 py-3 tabular-nums">{usage[c.slug] ?? 0}</td>
                  <td className="px-4 py-3">{c.active ? <span className="text-xs text-emerald-300">Visible</span> : <span className="text-xs text-steel">Oculta</span>}</td>
                  <td className="px-4 py-3">
                    {canWrite && (
                      <div className="flex justify-end gap-2">
                        <button type="button" onClick={() => { setEditing(c.id); setDraft({ slug: c.slug, name: c.name, description: c.description, sortOrder: c.sortOrder, active: c.active }); }} className="rounded-full border border-bone/15 p-2 hover:border-bone" aria-label={`Editar ${c.name}`}><Pencil size={14} /></button>
                        <button type="button" disabled={busy} onClick={() => remove(c)} className="rounded-full border border-bone/15 p-2 hover:border-blood hover:text-blood" aria-label={`Eliminar ${c.name}`}><Trash2 size={14} /></button>
                      </div>
                    )}
                  </td>
                </tr>
              ),
            )}
          </tbody>
        </table>
      </div>
      {canWrite && (
        <Card className="h-fit space-y-4 p-6">
          <h2 className="font-display text-2xl font-black uppercase">Nueva categoría</h2>
          <label className="block space-y-2">
            <span className={labelCls}>Nombre</span>
            <input value={creating.name} onChange={(e) => setCreating({ ...creating, name: e.target.value, slug: slugify(e.target.value) })} className={inputCls} />
          </label>
          <label className="block space-y-2">
            <span className={labelCls}>Slug</span>
            <input value={creating.slug} onChange={(e) => setCreating({ ...creating, slug: slugify(e.target.value) })} className={`${inputCls} font-mono`} />
          </label>
          <label className="block space-y-2">
            <span className={labelCls}>Descripción</span>
            <input value={creating.description} onChange={(e) => setCreating({ ...creating, description: e.target.value })} className={inputCls} />
          </label>
          <div className="flex gap-2">
            <button type="button" disabled={busy} onClick={() => save("/api/admin/categories", "POST", creating, "Categoría creada.")} className={btnPrimary}><Plus size={15} /> Crear</button>
            <button type="button" onClick={() => setCreating(empty)} className={btnGhost}>Limpiar</button>
          </div>
          <p className="text-xs text-steel">Las categorías visibles con productos activos aparecen como filtros en la tienda. Renombrar el slug actualiza sus productos.</p>
        </Card>
      )}
    </div>
  );
}
