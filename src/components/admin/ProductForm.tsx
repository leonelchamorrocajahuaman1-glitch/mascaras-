"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, ImagePlus, Loader2, Plus, Save, Trash2, X } from "lucide-react";
import { MASKS } from "@/lib/masks";
import { slugify } from "@/lib/format";
import type { MaskKey, Product } from "@/lib/types";

type VariantDraft = { id?: string; name: string; sku: string; stock: string; price: string };

const toMoney = (cents: number | null | undefined) => (cents === null || cents === undefined ? "" : (cents / 100).toFixed(2));
const toCents = (v: string) => (v.trim() === "" ? null : Math.round(Number(v.replace(",", ".")) * 100));

const input = "h-11 w-full rounded-xl border border-bone/15 bg-ink px-3 text-sm focus:border-blood focus:outline-none";
const labelCls = "font-mono text-[10px] uppercase tracking-[0.2em] text-steel";

export interface ModelOption {
  url: string;
  name: string;
  ok: boolean;
}

export function ProductForm({ product, models = [] }: { product?: Product; models?: ModelOption[] }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(product?.name ?? "");
  const [slug, setSlug] = useState(product?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(Boolean(product));
  const [category, setCategory] = useState<MaskKey>(product?.category ?? "classic-red");
  const [modelKey, setModelKey] = useState<MaskKey>(product?.modelKey ?? "classic-red");
  const [modelUrl, setModelUrl] = useState<string>(product?.modelUrl ?? "");
  const [tagline, setTagline] = useState(product?.tagline ?? "");
  const [description, setDescription] = useState(product?.description ?? "");
  const [price, setPrice] = useState(toMoney(product?.priceCents ?? 14900));
  const [compare, setCompare] = useState(toMoney(product?.compareAtCents));
  const [featured, setFeatured] = useState(product?.featured ?? false);
  const [active, setActive] = useState(product?.active ?? true);
  const [images, setImages] = useState<string[]>(product?.images ?? []);
  const [variants, setVariants] = useState<VariantDraft[]>(
    product?.variants.map((v) => ({ id: v.id, name: v.name, sku: v.sku, stock: String(v.stock), price: toMoney(v.priceCents) })) ?? [
      { name: "Talla única", sku: "", stock: "10", price: "" },
    ],
  );
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pathDraft, setPathDraft] = useState("");

  const setVariant = (i: number, patch: Partial<VariantDraft>) => setVariants((vs) => vs.map((v, j) => (j === i ? { ...v, ...patch } : v)));

  const upload = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    setError(null);
    for (const file of Array.from(files)) {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(`${file.name}: ${data.error ?? "error al subir"}`);
        continue;
      }
      setImages((im) => [...im, data.url]);
    }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  const move = (i: number, dir: -1 | 1) =>
    setImages((im) => {
      const next = [...im];
      const j = i + dir;
      if (j < 0 || j >= next.length) return im;
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaved(false);
    const priceCents = toCents(price);
    if (priceCents === null || Number.isNaN(priceCents)) return setError("Introduce un precio válido.");
    const body = {
      name,
      slug,
      category,
      modelKey,
      modelUrl: modelUrl || null,
      tagline,
      description,
      priceCents,
      compareAtCents: toCents(compare),
      featured,
      active,
      images,
      variants: variants.map((v) => ({
        ...(v.id ? { id: v.id } : {}),
        name: v.name,
        sku: v.sku || `${slug}-${slugify(v.name)}`.toUpperCase().slice(0, 40),
        stock: Math.max(0, Math.floor(Number(v.stock) || 0)),
        priceCents: toCents(v.price),
      })),
    };
    if (body.variants.some((v) => v.priceCents !== null && Number.isNaN(v.priceCents))) return setError("Revisa los precios de las variantes.");
    setSaving(true);
    const res = await fetch(product ? `/api/admin/products/${product.id}` : "/api/admin/products", {
      method: product ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) return setError(data.error ?? "No se pudo guardar.");
    if (!product) {
      router.replace(`/admin/products/${data.product.id}`);
    } else {
      setSaved(true);
      setVariants(data.product.variants.map((v: Product["variants"][number]) => ({ id: v.id, name: v.name, sku: v.sku, stock: String(v.stock), price: toMoney(v.priceCents) })));
    }
    router.refresh();
  };

  return (
    <form onSubmit={submit} className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
      <div className="space-y-6">
        <section className="space-y-4 rounded-2xl border border-bone/10 p-6">
          <h2 className="font-display text-2xl font-black uppercase">Información</h2>
          <label className="block space-y-2">
            <span className={labelCls}>Nombre</span>
            <input
              required
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (!slugTouched) setSlug(slugify(e.target.value));
              }}
              className={input}
            />
          </label>
          <label className="block space-y-2">
            <span className={labelCls}>Slug (URL)</span>
            <input
              required
              value={slug}
              onChange={(e) => {
                setSlugTouched(true);
                setSlug(slugify(e.target.value));
              }}
              className={`${input} font-mono`}
            />
          </label>
          <label className="block space-y-2">
            <span className={labelCls}>Eslogan</span>
            <input value={tagline} onChange={(e) => setTagline(e.target.value)} maxLength={140} className={input} />
          </label>
          <label className="block space-y-2">
            <span className={labelCls}>Descripción</span>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={5} maxLength={2000} className={`${input} h-auto py-3`} />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block space-y-2">
              <span className={labelCls}>Colección</span>
              <select value={category} onChange={(e) => setCategory(e.target.value as MaskKey)} className={input}>
                {MASKS.map((m) => <option key={m.key} value={m.key}>{m.name}</option>)}
              </select>
            </label>
            <label className="block space-y-2">
              <span className={labelCls}>Estilo procedural (laboratorio)</span>
              <select value={modelKey} onChange={(e) => setModelKey(e.target.value as MaskKey)} className={input}>
                {MASKS.map((m) => <option key={m.key} value={m.key}>{m.name}</option>)}
              </select>
            </label>
          </div>
          <label className="block space-y-2">
            <span className={labelCls}>Modelo 3D (GLB real)</span>
            <select value={modelUrl} onChange={(e) => setModelUrl(e.target.value)} className={input}>
              <option value="">— Sin modelo 3D —</option>
              {models.map((m) => (
                <option key={m.url} value={m.url} disabled={!m.ok}>
                  {m.name} · {decodeURIComponent(m.url)}
                  {m.ok ? "" : " (archivo con errores)"}
                </option>
              ))}
              {modelUrl && !models.some((m) => m.url === modelUrl) && <option value={modelUrl}>{modelUrl} (no encontrado)</option>}
            </select>
            <span className="block text-xs text-steel">
              {models.length
                ? "Archivos detectados en public/models. Se muestra en la ficha, en la Galería 3D y en el laboratorio."
                : "No hay archivos en public/models. Copia allí tus .glb y recarga esta página."}
            </span>
          </label>
        </section>

        <section className="space-y-4 rounded-2xl border border-bone/10 p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-2xl font-black uppercase">Variantes y existencias</h2>
            <button type="button" onClick={() => setVariants((v) => [...v, { name: "", sku: "", stock: "0", price: "" }])} className="flex items-center gap-1 text-sm text-steel hover:text-bone">
              <Plus size={14} /> Añadir
            </button>
          </div>
          <div className="space-y-3">
            {variants.map((v, i) => (
              <div key={v.id ?? `new-${i}`} className="grid grid-cols-2 gap-3 rounded-xl bg-ink/50 p-3 sm:grid-cols-[1.4fr_1.2fr_0.8fr_1fr_auto] sm:items-end">
                <label className="space-y-1">
                  <span className={labelCls}>Nombre</span>
                  <input required value={v.name} onChange={(e) => setVariant(i, { name: e.target.value })} placeholder="Talla M" className={input} />
                </label>
                <label className="space-y-1">
                  <span className={labelCls}>SKU</span>
                  <input value={v.sku} onChange={(e) => setVariant(i, { sku: e.target.value })} placeholder="auto" className={`${input} font-mono`} />
                </label>
                <label className="space-y-1">
                  <span className={labelCls}>Stock</span>
                  <input type="number" min={0} value={v.stock} onChange={(e) => setVariant(i, { stock: e.target.value })} className={input} />
                </label>
                <label className="space-y-1">
                  <span className={labelCls}>Precio propio</span>
                  <input inputMode="decimal" value={v.price} onChange={(e) => setVariant(i, { price: e.target.value })} placeholder="= producto" className={input} />
                </label>
                <button
                  type="button"
                  onClick={() => setVariants((vs) => vs.filter((_, j) => j !== i))}
                  disabled={variants.length === 1}
                  className="flex h-11 items-center justify-center rounded-xl border border-bone/15 px-3 hover:border-blood hover:text-blood disabled:opacity-30"
                  aria-label="Eliminar variante"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="space-y-6">
        <section className="space-y-4 rounded-2xl border border-bone/10 p-6">
          <h2 className="font-display text-2xl font-black uppercase">Precio</h2>
          <div className="grid grid-cols-2 gap-4">
            <label className="block space-y-2">
              <span className={labelCls}>Precio (USD)</span>
              <input required inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} className={input} />
            </label>
            <label className="block space-y-2">
              <span className={labelCls}>Precio anterior</span>
              <input inputMode="decimal" value={compare} onChange={(e) => setCompare(e.target.value)} placeholder="opcional" className={input} />
            </label>
          </div>
          <label className="flex items-center gap-3 text-sm">
            <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="h-4 w-4 accent-[#e1121f]" /> Visible en la tienda
          </label>
          <label className="flex items-center gap-3 text-sm">
            <input type="checkbox" checked={featured} onChange={(e) => setFeatured(e.target.checked)} className="h-4 w-4 accent-[#e1121f]" /> Destacado
          </label>
        </section>

        <section className="space-y-4 rounded-2xl border border-bone/10 p-6">
          <h2 className="font-display text-2xl font-black uppercase">Imágenes</h2>
          <p className="text-xs text-steel">JPG, PNG, WebP o AVIF · máx. 5 MB. La primera es la principal. Si no hay imágenes se usa el render del modelo 3D.</p>
          <div className="grid grid-cols-3 gap-3">
            {images.map((src, i) => (
              <div key={src} className="group relative aspect-[4/5] overflow-hidden rounded-xl bg-ink">
                <Image src={src} alt="" fill sizes="120px" className="object-cover" unoptimized={src.startsWith("/api/") || src.startsWith("http")} />
                {i === 0 && <span className="absolute left-1.5 top-1.5 rounded bg-blood px-1.5 py-0.5 text-[9px] uppercase">Principal</span>}
                <div className="absolute inset-x-0 bottom-0 flex justify-between bg-black/70 p-1 opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100">
                  <button type="button" onClick={() => move(i, -1)} aria-label="Mover a la izquierda" className="p-1 hover:text-blood"><ArrowLeft size={13} /></button>
                  <button type="button" onClick={() => setImages((im) => im.filter((x) => x !== src))} aria-label="Quitar imagen" className="p-1 hover:text-blood"><X size={13} /></button>
                  <button type="button" onClick={() => move(i, 1)} aria-label="Mover a la derecha" className="p-1 hover:text-blood"><ArrowRight size={13} /></button>
                </div>
              </div>
            ))}
            <label className="flex aspect-[4/5] cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-bone/20 text-xs text-steel hover:border-blood hover:text-bone">
              {uploading ? <Loader2 size={18} className="animate-spin" /> : <ImagePlus size={18} />}
              {uploading ? "Subiendo…" : "Subir"}
              <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/avif" multiple className="sr-only" onChange={(e) => upload(e.target.files)} />
            </label>
          </div>
          <details className="text-xs text-steel">
            <summary className="cursor-pointer">Añadir por ruta</summary>
            <div className="mt-2 flex gap-2">
              <input
                value={pathDraft}
                onChange={(e) => setPathDraft(e.target.value)}
                placeholder="/images/masks/classic-red.webp"
                className={`${input} h-9 font-mono text-xs`}
              />
              <button
                type="button"
                onClick={() => {
                  const v = pathDraft.trim();
                  if (v.startsWith("/") || v.startsWith("https://")) setImages((im) => (im.includes(v) ? im : [...im, v]));
                  setPathDraft("");
                }}
                className="rounded-xl border border-bone/15 px-3 text-xs hover:border-bone"
              >
                Añadir
              </button>
            </div>
          </details>
        </section>

        {error && <p role="alert" className="rounded-xl border border-blood/50 bg-blood/10 px-4 py-3 text-sm">{error}</p>}
        {saved && <p role="status" className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">Cambios guardados.</p>}
        <button type="submit" disabled={saving || uploading} className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-blood text-sm text-white hover:bg-ember disabled:opacity-50">
          {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} {product ? "Guardar cambios" : "Crear producto"}
        </button>
      </div>
    </form>
  );
}
