"use client";

import { useMemo, useState } from "react";
import { BarChart3, Table2 } from "lucide-react";
import { formatMoney } from "@/lib/format";

interface Point {
  key: string;
  label: string;
  amountCents: number;
  orders: number;
}

const W = 760;
const H = 260;
const M = { top: 16, right: 12, bottom: 30, left: 56 };

function niceMax(v: number) {
  if (v <= 0) return 1;
  const exp = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / exp;
  const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10;
  return step * exp;
}

/**
 * Columnas de una sola serie (sin leyenda: el título la nombra). Rojo de marca validado sobre el fondo oscuro.
 * Hover/foco muestra el detalle; hay vista de tabla accesible.
 */
export function SalesChart({ daily, monthly }: { daily: Point[]; monthly: Point[] }) {
  const [range, setRange] = useState<"daily" | "monthly">("daily");
  const [metric, setMetric] = useState<"amount" | "orders">("amount");
  const [table, setTable] = useState(false);
  const [hover, setHover] = useState<number | null>(null);
  const data = range === "daily" ? daily : monthly;
  const value = (p: Point) => (metric === "amount" ? p.amountCents / 100 : p.orders);
  const fmt = (v: number) => (metric === "amount" ? formatMoney(Math.round(v * 100)) : `${v} pedido${v === 1 ? "" : "s"}`);

  const { max, ticks } = useMemo(() => {
    const m = niceMax(Math.max(...data.map(value), 0));
    return { max: m, ticks: [0, m / 4, m / 2, (3 * m) / 4, m] };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, metric]);

  const innerW = W - M.left - M.right;
  const innerH = H - M.top - M.bottom;
  const band = innerW / data.length;
  const barW = Math.min(24, Math.max(4, band - 2));
  const y = (v: number) => M.top + innerH - (v / max) * innerH;
  const total = data.reduce((s, p) => s + value(p), 0);
  const labelEvery = range === "daily" ? 5 : 1;
  const hp = hover !== null ? data[hover] : null;

  const seg = (opts: [string, string][], val: string, set: (v: never) => void, label: string) => (
    <div className="inline-flex rounded-full border border-bone/10 p-0.5" role="group" aria-label={label}>
      {opts.map(([k, l]) => (
        <button key={k} type="button" aria-pressed={val === k} onClick={() => set(k as never)} className={`rounded-full px-3 py-1 text-xs transition ${val === k ? "bg-bone text-ink" : "text-bone/70 hover:text-bone"}`}>
          {l}
        </button>
      ))}
    </div>
  );

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {seg([["daily", "30 días"], ["monthly", "12 meses"]], range, setRange as (v: never) => void, "Periodo")}
        {seg([["amount", "Importe"], ["orders", "Pedidos"]], metric, setMetric as (v: never) => void, "Métrica")}
        <button type="button" onClick={() => setTable((t) => !t)} aria-pressed={table} className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-bone/10 px-3 py-1 text-xs text-bone/70 hover:text-bone">
          {table ? <BarChart3 size={13} /> : <Table2 size={13} />} {table ? "Ver gráfico" : "Ver tabla"}
        </button>
      </div>
      <p className="mb-2 text-xs text-steel">
        Total del periodo: <span className="tabular-nums text-bone">{fmt(total)}</span>
      </p>

      {table ? (
        <div className="max-h-[300px] overflow-y-auto rounded-xl border border-bone/10">
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 bg-[#0d0d10] font-mono text-[10px] uppercase tracking-[0.2em] text-steel">
              <tr>
                <th className="px-3 py-2 font-normal">{range === "daily" ? "Día" : "Mes"}</th>
                <th className="px-3 py-2 text-right font-normal">Importe</th>
                <th className="px-3 py-2 text-right font-normal">Pedidos</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-bone/5">
              {data.map((p) => (
                <tr key={p.key}>
                  <td className="px-3 py-1.5">{p.label}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums">{formatMoney(p.amountCents)}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums">{p.orders}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="relative">
          <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={`Gráfico de ${metric === "amount" ? "importe" : "pedidos"} por ${range === "daily" ? "día" : "mes"}`} onMouseLeave={() => setHover(null)}>
            {ticks.map((t) => (
              <g key={t}>
                <line x1={M.left} x2={W - M.right} y1={y(t)} y2={y(t)} stroke="rgba(243,243,241,0.08)" strokeWidth={1} />
                <text x={M.left - 8} y={y(t)} textAnchor="end" dominantBaseline="middle" className="fill-[#8b8f96] text-[11px] tabular-nums">
                  {metric === "amount" ? (t >= 1000 ? `$${(t / 1000).toLocaleString("en-US")}k` : `$${t}`) : t}
                </text>
              </g>
            ))}
            {data.map((p, i) => {
              const v = value(p);
              const x = M.left + band * i + (band - barW) / 2;
              const top = y(v);
              const h = Math.max(0, M.top + innerH - top);
              const r = Math.min(4, h, barW / 2);
              return (
                <g key={p.key}>
                  {/* Zona de interacción más grande que la barra */}
                  <rect
                    x={M.left + band * i}
                    y={M.top}
                    width={band}
                    height={innerH}
                    fill={hover === i ? "rgba(243,243,241,0.04)" : "transparent"}
                    onMouseEnter={() => setHover(i)}
                    onFocus={() => setHover(i)}
                    onBlur={() => setHover(null)}
                    tabIndex={0}
                    aria-label={`${p.label}: ${formatMoney(p.amountCents)}, ${p.orders} pedidos`}
                  />
                  {h > 0 && (
                    <path
                      d={`M${x},${top + h} V${top + r} Q${x},${top} ${x + r},${top} H${x + barW - r} Q${x + barW},${top} ${x + barW},${top + r} V${top + h} Z`}
                      fill="#e1121f"
                      opacity={hover === null || hover === i ? 1 : 0.45}
                      pointerEvents="none"
                    />
                  )}
                  {i % labelEvery === 0 && (
                    <text x={M.left + band * i + band / 2} y={H - 10} textAnchor="middle" className="fill-[#8b8f96] text-[10px]">
                      {p.label}
                    </text>
                  )}
                </g>
              );
            })}
            <line x1={M.left} x2={W - M.right} y1={M.top + innerH} y2={M.top + innerH} stroke="rgba(243,243,241,0.2)" strokeWidth={1} />
          </svg>
          {hp && hover !== null && (
            <div
              className="pointer-events-none absolute top-2 z-10 -translate-x-1/2 rounded-xl border border-bone/15 bg-[#0d0d10]/95 px-3 py-2 text-xs shadow-xl"
              style={{ left: `${((M.left + band * hover + band / 2) / W) * 100}%` }}
            >
              <p className="text-steel">{hp.label}</p>
              <p className="tabular-nums text-bone">{formatMoney(hp.amountCents)}</p>
              <p className="tabular-nums text-steel">{hp.orders} pedido{hp.orders === 1 ? "" : "s"}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
