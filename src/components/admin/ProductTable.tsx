"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import { formatMoney } from "@/lib/format";
import { MASK_BY_KEY } from "@/lib/masks";
import type { Product } from "@/lib/types";

export function ProductTable({ products, images }: { products: Product[]; images: Record<string, string | null> }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const remove = async (p: Product) => {
    if (!window.confirm(`¿Eliminar "${p.name}"? Esta acción no se puede deshacer. Los pedidos existentes conservan sus datos.`)) return;
    setBusy(p.id);
    setError(null);
    const res = await fetch(`/api/admin/products/${p.id}`, { method: "DELETE" });
    if (!res.ok) setError((await res.json().catch(() => ({}))).error ?? "No se pudo eliminar.");
    setBusy(null);
    router.refresh();
  };

  return (
    <div className="overflow-x-auto rounded-2xl border border-bone/10">
      {error && <p role="alert" className="border-b border-blood/40 bg-blood/10 px-4 py-3 text-sm">{error}</p>}
      <table className="w-full min-w-[760px] text-left text-sm">
        <thead className="border-b border-bone/10 font-mono text-[10px] uppercase tracking-[0.2em] text-steel">
          <tr>
            <th className="px-4 py-3 font-normal">Producto</th>
            <th className="px-4 py-3 font-normal">Colección</th>
            <th className="px-4 py-3 font-normal">Precio</th>
            <th className="px-4 py-3 font-normal">Stock</th>
            <th className="px-4 py-3 font-normal">Estado</th>
            <th className="px-4 py-3 font-normal"><span className="sr-only">Acciones</span></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-bone/10">
          {products.map((p) => {
            const stock = p.variants.reduce((s, v) => s + v.stock, 0);
            const img = images[p.id];
            return (
              <tr key={p.id} className="hover:bg-bone/[0.02]">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="relative h-12 w-10 shrink-0 overflow-hidden rounded bg-ink">
                      {img && <Image src={img} alt="" fill sizes="40px" className="object-contain" unoptimized={img.startsWith("/api/") || img.startsWith("http")} />}
                    </div>
                    <div>
                      <p className="font-medium">{p.name}</p>
                      <p className="font-mono text-[10px] text-steel">/{p.slug}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-bone/70">{MASK_BY_KEY[p.category]?.name ?? p.category}</td>
                <td className="px-4 py-3 tabular-nums">{formatMoney(p.priceCents)}</td>
                <td className={`px-4 py-3 tabular-nums ${stock === 0 ? "text-blood" : ""}`}>{stock} <span className="text-steel">/ {p.variants.length} var.</span></td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2.5 py-1 text-xs ${p.active ? "bg-emerald-500/15 text-emerald-300" : "bg-bone/5 text-steel"}`}>{p.active ? "Activo" : "Oculto"}</span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    <Link href={`/admin/products/${p.id}`} className="rounded-full border border-bone/15 p-2 hover:border-bone" aria-label={`Editar ${p.name}`}>
                      <Pencil size={14} />
                    </Link>
                    <button type="button" onClick={() => remove(p)} disabled={busy === p.id} className="rounded-full border border-bone/15 p-2 hover:border-blood hover:text-blood disabled:opacity-40" aria-label={`Eliminar ${p.name}`}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
