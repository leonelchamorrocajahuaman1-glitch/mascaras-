"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Box, Pencil, Search, Star, Trash2 } from "lucide-react";
import { formatMoney } from "@/lib/format";
import type { Category, Product } from "@/lib/types";
import { adminFetch, useFeedback } from "./feedback";
import { EmptyState, StockBadge, inputCls } from "./ui";

type SortKey = "updated" | "name" | "price-asc" | "price-desc" | "stock-asc" | "stock-desc";

function Switch({ on, onChange, label, disabled }: { on: boolean; onChange: () => void; label: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      disabled={disabled}
      onClick={onChange}
      className={`relative h-6 w-11 shrink-0 rounded-full border transition disabled:opacity-40 ${on ? "border-blood bg-blood/80" : "border-bone/20 bg-bone/5"}`}
    >
      <span className={`absolute top-0.5 h-4.5 w-4.5 rounded-full bg-white shadow transition-all ${on ? "left-[22px]" : "left-0.5"}`} style={{ height: 18, width: 18 }} />
    </button>
  );
}

export function ProductsManager({
  products,
  categories,
  images,
  lowStock,
  canWrite,
  canDelete,
}: {
  products: Product[];
  categories: Category[];
  images: Record<string, string | null>;
  lowStock: number;
  canWrite: boolean;
  canDelete: boolean;
}) {
  const router = useRouter();
  const { toast, confirm } = useFeedback();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");
  const [status, setStatus] = useState<"" | "active" | "inactive" | "featured">("");
  const [stock, setStock] = useState<"" | "low" | "out">("");
  const [model, setModel] = useState<"" | "with" | "without">("");
  const [sort, setSort] = useState<SortKey>("updated");
  const [busy, setBusy] = useState<string | null>(null);

  const catName = useMemo(() => new Map(categories.map((c) => [c.slug, c.name])), [categories]);
  const totalStock = (p: Product) => p.variants.reduce((s, v) => s + v.stock, 0);

  const list = useMemo(() => {
    const term = q.trim().toLowerCase();
    const out = products.filter((p) => {
      const t = totalStock(p);
      return (
        (!term || `${p.name} ${p.slug} ${p.variants.map((v) => v.sku).join(" ")}`.toLowerCase().includes(term)) &&
        (!cat || p.category === cat) &&
        (!status || (status === "active" ? p.active : status === "inactive" ? !p.active : p.featured)) &&
        (!stock || (stock === "out" ? p.variants.some((v) => v.stock <= 0) : p.variants.some((v) => v.stock > 0 && v.stock <= lowStock))) &&
        (!model || (model === "with" ? Boolean(p.modelUrl) : !p.modelUrl)) &&
        t >= 0
      );
    });
    const by: Record<SortKey, (a: Product, b: Product) => number> = {
      updated: (a, b) => b.updatedAt.localeCompare(a.updatedAt),
      name: (a, b) => a.name.localeCompare(b.name),
      "price-asc": (a, b) => a.priceCents - b.priceCents,
      "price-desc": (a, b) => b.priceCents - a.priceCents,
      "stock-asc": (a, b) => totalStock(a) - totalStock(b),
      "stock-desc": (a, b) => totalStock(b) - totalStock(a),
    };
    return out.sort(by[sort]);
  }, [products, q, cat, status, stock, model, sort, lowStock]);

  const patch = async (p: Product, body: Partial<Pick<Product, "active" | "featured">>, msg: string) => {
    setBusy(p.id);
    try {
      await adminFetch(`/api/admin/products/${p.id}`, { method: "PATCH", json: body });
      toast(msg);
      router.refresh();
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setBusy(null);
    }
  };

  const remove = async (p: Product) => {
    const ok = await confirm({
      title: `Eliminar ${p.name}`,
      body: "Se eliminará el producto y sus variantes. Los pedidos ya realizados conservan sus datos. Si solo quieres ocultarlo, desactívalo.",
      confirmLabel: "Eliminar definitivamente",
      danger: true,
    });
    if (!ok) return;
    setBusy(p.id);
    try {
      await adminFetch(`/api/admin/products/${p.id}`, { method: "DELETE" });
      toast(`"${p.name}" eliminado.`);
      router.refresh();
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setBusy(null);
    }
  };

  const select = "h-11 rounded-xl border border-bone/15 bg-black/40 px-3 text-sm focus:border-blood focus:outline-none";

  return (
    <div>
      <div className="mb-5 grid gap-3 lg:grid-cols-[1.4fr_repeat(5,minmax(0,1fr))]">
        <label className="relative">
          <span className="sr-only">Buscar productos</span>
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-steel" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar nombre, slug o SKU…" className={`${inputCls} pl-9`} />
        </label>
        <select aria-label="Categoría" value={cat} onChange={(e) => setCat(e.target.value)} className={select}>
          <option value="">Todas las categorías</option>
          {categories.map((c) => <option key={c.id} value={c.slug}>{c.name}</option>)}
        </select>
        <select aria-label="Estado" value={status} onChange={(e) => setStatus(e.target.value as typeof status)} className={select}>
          <option value="">Todos los estados</option>
          <option value="active">Activos</option>
          <option value="inactive">Ocultos</option>
          <option value="featured">Destacados</option>
        </select>
        <select aria-label="Stock" value={stock} onChange={(e) => setStock(e.target.value as typeof stock)} className={select}>
          <option value="">Todo el stock</option>
          <option value="low">Con stock bajo</option>
          <option value="out">Con agotados</option>
        </select>
        <select aria-label="Modelo 3D" value={model} onChange={(e) => setModel(e.target.value as typeof model)} className={select}>
          <option value="">Con y sin 3D</option>
          <option value="with">Con modelo 3D</option>
          <option value="without">Sin modelo 3D</option>
        </select>
        <select aria-label="Ordenar" value={sort} onChange={(e) => setSort(e.target.value as SortKey)} className={select}>
          <option value="updated">Última edición</option>
          <option value="name">Nombre A-Z</option>
          <option value="price-asc">Precio ↑</option>
          <option value="price-desc">Precio ↓</option>
          <option value="stock-asc">Stock ↑</option>
          <option value="stock-desc">Stock ↓</option>
        </select>
      </div>
      <p className="mb-3 text-xs text-steel" aria-live="polite">{list.length} de {products.length} productos</p>

      {list.length === 0 ? (
        <EmptyState title="Sin resultados">Ningún producto coincide con los filtros.</EmptyState>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-bone/10 bg-white/[0.02]">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="border-b border-bone/10 font-mono text-[10px] uppercase tracking-[0.2em] text-steel">
              <tr>
                <th className="px-4 py-3 font-normal">Producto</th>
                <th className="px-4 py-3 font-normal">Categoría</th>
                <th className="px-4 py-3 font-normal">Precio</th>
                <th className="px-4 py-3 font-normal">Stock</th>
                <th className="px-4 py-3 font-normal">3D</th>
                <th className="px-4 py-3 font-normal">Visible</th>
                <th className="px-4 py-3 font-normal">Destacado</th>
                <th className="px-4 py-3 font-normal"><span className="sr-only">Acciones</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-bone/5">
              {list.map((p) => {
                const img = images[p.id];
                const t = totalStock(p);
                const minStock = Math.min(...p.variants.map((v) => v.stock));
                const discount = p.compareAtCents && p.compareAtCents > p.priceCents ? Math.round((1 - p.priceCents / p.compareAtCents) * 100) : 0;
                return (
                  <tr key={p.id} className={`transition hover:bg-bone/[0.02] ${busy === p.id ? "opacity-50" : ""}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="relative h-12 w-10 shrink-0 overflow-hidden rounded-lg bg-black/50">
                          {img && <Image src={img} alt="" fill sizes="40px" className="object-contain" unoptimized={img.startsWith("/api/") || img.startsWith("http")} />}
                        </div>
                        <div className="min-w-0">
                          <Link href={`/admin/productos/${p.id}`} className="font-medium hover:text-blood">{p.name}</Link>
                          <p className="truncate font-mono text-[10px] text-steel">/{p.slug} · {p.variants.length} var.</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-bone/70">{catName.get(p.category) ?? p.category}</td>
                    <td className="px-4 py-3 tabular-nums">
                      {formatMoney(p.priceCents)}
                      {discount > 0 && <span className="ml-2 rounded bg-blood/15 px-1.5 py-0.5 text-[10px] text-blood">-{discount}%</span>}
                    </td>
                    <td className="px-4 py-3">
                      <StockBadge stock={minStock <= 0 ? 0 : t} threshold={lowStock} />
                    </td>
                    <td className="px-4 py-3">
                      {p.modelUrl ? <Box size={16} className="text-blood" aria-label="Con modelo 3D" /> : <span className="text-xs text-steel">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <Switch on={p.active} disabled={!canWrite || busy === p.id} label={`Visible en la tienda: ${p.name}`} onChange={() => patch(p, { active: !p.active }, p.active ? `"${p.name}" oculto en la tienda.` : `"${p.name}" visible en la tienda.`)} />
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        disabled={!canWrite || busy === p.id}
                        onClick={() => patch(p, { featured: !p.featured }, p.featured ? "Ya no es destacado." : "Marcado como destacado.")}
                        aria-pressed={p.featured}
                        aria-label={`Destacado: ${p.name}`}
                        className="rounded-full p-1.5 transition hover:bg-bone/5 disabled:opacity-40"
                      >
                        <Star size={17} className={p.featured ? "fill-blood text-blood" : "text-steel"} />
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <Link href={`/admin/productos/${p.id}`} className="rounded-full border border-bone/15 p-2 hover:border-bone" aria-label={`Editar ${p.name}`}>
                          <Pencil size={14} />
                        </Link>
                        {canDelete && (
                          <button type="button" onClick={() => remove(p)} disabled={busy === p.id} className="rounded-full border border-bone/15 p-2 hover:border-blood hover:text-blood disabled:opacity-40" aria-label={`Eliminar ${p.name}`}>
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
