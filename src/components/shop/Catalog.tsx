"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowUpRight, LayoutGrid, Rows3, Search, X } from "lucide-react";
import { gsap, useGSAP } from "@/lib/gsap";
import { formatMoney, pad } from "@/lib/format";
import { MASKS } from "@/lib/masks";
import { TLink } from "../experience/RouteTransition";
import { ProductImage } from "./ProductImage";
import type { CatalogItem } from "./types";

type Sort = "featured" | "price-asc" | "price-desc" | "name" | "new";
const SORTS: { value: Sort; label: string }[] = [
  { value: "featured", label: "Destacados" },
  { value: "price-asc", label: "Precio ↑" },
  { value: "price-desc", label: "Precio ↓" },
  { value: "name", label: "Nombre" },
  { value: "new", label: "Novedades" },
];

export function Catalog({ items }: { items: CatalogItem[] }) {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const root = useRef<HTMLDivElement>(null);
  const preview = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState<CatalogItem | null>(null);

  const [q, setQ] = useState(params.get("q") ?? "");
  const [cats, setCats] = useState<string[]>(params.get("cat")?.split(",").filter(Boolean) ?? []);
  const [inStock, setInStock] = useState(params.get("stock") === "1");
  const [maxPrice, setMaxPrice] = useState(Number(params.get("max")) || 0);
  const [sort, setSort] = useState<Sort>((params.get("sort") as Sort) || "featured");
  const [view, setView] = useState<"rows" | "grid">(params.get("view") === "grid" ? "grid" : "rows");

  const priceCeil = useMemo(() => Math.ceil(Math.max(...items.map((i) => i.priceCents), 0) / 1000) * 1000, [items]);
  const effectiveMax = maxPrice || priceCeil;

  // Mantiene los filtros en la URL (se pueden compartir y sobreviven a recargas).
  useEffect(() => {
    const sp = new URLSearchParams();
    if (q) sp.set("q", q);
    if (cats.length) sp.set("cat", cats.join(","));
    if (inStock) sp.set("stock", "1");
    if (maxPrice && maxPrice < priceCeil) sp.set("max", String(maxPrice));
    if (sort !== "featured") sp.set("sort", sort);
    if (view === "grid") sp.set("view", "grid");
    const qs = sp.toString();
    const id = window.setTimeout(() => router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false }), 250);
    return () => window.clearTimeout(id);
  }, [q, cats, inStock, maxPrice, sort, view, pathname, router, priceCeil]);

  const results = useMemo(() => {
    const term = q.trim().toLowerCase();
    const list = items.filter(
      (i) =>
        (!term || `${i.name} ${i.tagline} ${i.categoryName} ${i.code}`.toLowerCase().includes(term)) &&
        (!cats.length || cats.includes(i.category)) &&
        (!inStock || i.stock > 0) &&
        i.priceCents <= effectiveMax,
    );
    const by: Record<Sort, (a: CatalogItem, b: CatalogItem) => number> = {
      featured: (a, b) => Number(b.featured) - Number(a.featured),
      "price-asc": (a, b) => a.priceCents - b.priceCents,
      "price-desc": (a, b) => b.priceCents - a.priceCents,
      name: (a, b) => a.name.localeCompare(b.name),
      new: (a, b) => b.createdAt.localeCompare(a.createdAt),
    };
    return list.sort(by[sort]);
  }, [items, q, cats, inStock, effectiveMax, sort]);

  const filtersActive = Boolean(q || cats.length || inStock || (maxPrice && maxPrice < priceCeil));
  const clear = () => {
    setQ("");
    setCats([]);
    setInStock(false);
    setMaxPrice(0);
  };

  // Vista previa flotante que sigue al cursor sobre las filas.
  useEffect(() => {
    if (!preview.current || window.matchMedia("(hover: none)").matches) return;
    const x = gsap.quickTo(preview.current, "x", { duration: 0.6, ease: "power3.out" });
    const y = gsap.quickTo(preview.current, "y", { duration: 0.6, ease: "power3.out" });
    const move = (e: PointerEvent) => {
      x(e.clientX + 30);
      y(e.clientY - 160);
    };
    window.addEventListener("pointermove", move);
    return () => window.removeEventListener("pointermove", move);
  }, []);

  useEffect(() => {
    if (!preview.current) return;
    gsap.to(preview.current, { opacity: hovered ? 1 : 0, scale: hovered ? 1 : 0.85, duration: 0.4, ease: "power3.out" });
  }, [hovered]);

  useGSAP(
    () => {
      gsap.fromTo(".cat-item", { opacity: 0, y: 30 }, { opacity: 1, y: 0, stagger: 0.05, duration: 0.8, ease: "power3.out" });
    },
    { scope: root, dependencies: [results.map((r) => r.id).join(), view] },
  );

  return (
    <div ref={root}>
      {/* Barra de búsqueda y filtros */}
      <div className="sticky top-0 z-30 border-y border-bone/10 bg-ink/85 px-[var(--gutter)] py-4 backdrop-blur-md">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center">
          <label className="relative flex flex-1 items-center">
            <Search size={16} className="pointer-events-none absolute left-4 text-steel" />
            <span className="sr-only">Buscar máscaras</span>
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar máscara, edición o código…"
              className="h-12 w-full rounded-full border border-bone/15 bg-transparent pl-11 pr-4 text-sm placeholder:text-steel focus:border-blood focus:outline-none"
            />
          </label>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none xl:pb-0" role="group" aria-label="Filtrar por colección">
            {MASKS.map((m) => {
              const on = cats.includes(m.key);
              return (
                <button
                  key={m.key}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setCats((c) => (on ? c.filter((x) => x !== m.key) : [...c, m.key]))}
                  className={`shrink-0 rounded-full border px-4 py-2.5 font-mono text-[10px] uppercase tracking-[0.2em] transition ${
                    on ? "border-blood bg-blood text-white" : "border-bone/15 text-bone/70 hover:border-bone/40"
                  }`}
                >
                  {m.name}
                </button>
              );
            })}
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-3 font-mono text-[10px] uppercase tracking-[0.2em] text-steel">
          <label className="flex cursor-pointer items-center gap-2">
            <input type="checkbox" checked={inStock} onChange={(e) => setInStock(e.target.checked)} className="h-4 w-4 accent-[#e1121f]" />
            Solo disponibles
          </label>
          <label className="flex items-center gap-3">
            Hasta <span className="w-16 tabular-nums text-bone">{formatMoney(effectiveMax)}</span>
            <input
              type="range"
              min={1000}
              max={priceCeil}
              step={1000}
              value={effectiveMax}
              onChange={(e) => setMaxPrice(Number(e.target.value))}
              className="w-32 accent-[#e1121f]"
              aria-label="Precio máximo"
            />
          </label>
          <label className="flex items-center gap-2">
            Ordenar
            <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} className="rounded-full border border-bone/15 bg-ink px-3 py-1.5 text-bone">
              {SORTS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
          {filtersActive && (
            <button type="button" onClick={clear} className="flex items-center gap-1 text-blood hover:text-ember">
              <X size={12} /> Limpiar filtros
            </button>
          )}
          <span className="ml-auto" aria-live="polite">
            {pad(results.length)} resultado{results.length === 1 ? "" : "s"}
          </span>
          <div className="flex gap-1" role="group" aria-label="Vista">
            <button type="button" onClick={() => setView("rows")} aria-pressed={view === "rows"} aria-label="Vista en filas" className={`rounded-full p-2 ${view === "rows" ? "bg-bone text-ink" : "hover:text-bone"}`}>
              <Rows3 size={14} />
            </button>
            <button type="button" onClick={() => setView("grid")} aria-pressed={view === "grid"} aria-label="Vista en galería" className={`rounded-full p-2 ${view === "grid" ? "bg-bone text-ink" : "hover:text-bone"}`}>
              <LayoutGrid size={14} />
            </button>
          </div>
        </div>
      </div>

      {results.length === 0 ? (
        <div className="flex min-h-[50svh] flex-col items-center justify-center gap-4 px-[var(--gutter)] text-center">
          <p className="font-display text-6xl font-black uppercase text-graphite">Sin resultados</p>
          <p className="text-sm text-steel">Ninguna máscara coincide con esos filtros.</p>
          <button type="button" onClick={clear} className="rounded-full border border-bone/20 px-6 py-3 font-mono text-[11px] uppercase tracking-[0.25em] hover:border-blood">
            Limpiar filtros
          </button>
        </div>
      ) : view === "rows" ? (
        <ul className="px-[var(--gutter)]" onPointerLeave={() => setHovered(null)}>
          {results.map((item, i) => (
            <li key={item.id} className="cat-item border-b border-bone/10">
              <TLink
                href={`/shop/${item.slug}`}
                onPointerEnter={() => setHovered(item)}
                className="group relative grid grid-cols-[auto_1fr_auto] items-center gap-4 overflow-hidden py-6 md:grid-cols-[60px_1fr_180px_160px_40px] md:gap-8 md:py-8"
              >
                <span className="absolute inset-0 origin-bottom scale-y-0 bg-blood transition-transform duration-500 ease-[var(--ease-cine)] group-hover:scale-y-100" aria-hidden />
                <span className="relative hidden font-mono text-xs text-steel transition-colors group-hover:text-white md:block">{pad(i + 1)}</span>
                <div className="relative h-20 w-16 shrink-0 bg-coal md:hidden">
                  <ProductImage src={item.image} alt={item.name} maskKey={item.category} sizes="64px" className="h-full w-full" />
                </div>
                <div className="relative min-w-0">
                  <p className="truncate font-display text-[clamp(36px,6vw,96px)] font-black uppercase leading-[0.9] transition-transform duration-500 group-hover:translate-x-3">
                    {item.name}
                  </p>
                  <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.25em] text-steel group-hover:text-white/80">
                    {item.code} · {item.tagline}
                  </p>
                </div>
                <span className="relative hidden font-mono text-[10px] uppercase tracking-[0.2em] text-steel group-hover:text-white md:block">
                  {item.stock > 0 ? `${item.variants.length} variantes · ${item.stock} uds` : "Agotado"}
                </span>
                <span className="relative text-right font-display text-3xl font-black tabular-nums md:text-4xl">
                  {formatMoney(item.priceCents)}
                  {item.compareAtCents && <span className="block font-mono text-xs font-normal text-steel line-through group-hover:text-white/70">{formatMoney(item.compareAtCents)}</span>}
                </span>
                <ArrowUpRight className="relative hidden transition-transform duration-500 group-hover:rotate-45 md:block" />
              </TLink>
            </li>
          ))}
        </ul>
      ) : (
        <ul className="grid grid-cols-1 gap-px bg-bone/10 sm:grid-cols-2 lg:grid-cols-3">
          {results.map((item) => (
            <li key={item.id} className="cat-item bg-ink">
              <TLink href={`/shop/${item.slug}`} className="group block p-[var(--gutter)]">
                <div className="relative aspect-[4/5] overflow-hidden bg-coal">
                  <div className="absolute inset-0 opacity-0 transition-opacity duration-700 group-hover:opacity-100" style={{ background: "radial-gradient(60% 50% at 50% 50%, rgba(225,18,31,0.35), transparent)" }} />
                  <ProductImage src={item.image} alt={item.name} maskKey={item.category} sizes="(max-width: 640px) 100vw, 33vw" className="h-full w-full transition-transform duration-[1.2s] ease-[var(--ease-out-expo)] group-hover:scale-105" />
                  <div className="hud-corners pointer-events-none absolute inset-3 opacity-0 transition-opacity group-hover:opacity-100" />
                  {item.stock === 0 && <span className="absolute left-4 top-4 rounded-full bg-ink/80 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.2em]">Agotado</span>}
                </div>
                <div className="mt-5 flex items-end justify-between gap-4">
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-blood">{item.code}</p>
                    <p className="font-display text-4xl font-black uppercase leading-none">{item.name}</p>
                  </div>
                  <p className="font-display text-3xl font-black tabular-nums">{formatMoney(item.priceCents)}</p>
                </div>
              </TLink>
            </li>
          ))}
        </ul>
      )}

      {/* Vista previa flotante (solo escritorio, filas) */}
      <div ref={preview} aria-hidden className="pointer-events-none fixed left-0 top-0 z-40 hidden h-[320px] w-[256px] opacity-0 md:block" style={{ display: view === "rows" ? undefined : "none" }}>
        {hovered && (
          <div className="relative h-full w-full overflow-hidden bg-coal shadow-[0_30px_80px_rgba(0,0,0,0.6)]">
            <div className="absolute inset-0" style={{ background: "radial-gradient(60% 50% at 50% 50%, rgba(225,18,31,0.35), transparent)" }} />
            <ProductImage src={hovered.image} alt="" maskKey={hovered.category} sizes="256px" className="h-full w-full" />
            <div className="hud-corners absolute inset-3" />
          </div>
        )}
      </div>
    </div>
  );
}
