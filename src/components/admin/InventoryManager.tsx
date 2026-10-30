"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDownToLine, ArrowUpFromLine, ClipboardCheck, History, Search, X } from "lucide-react";
import { formatDate } from "@/lib/format";
import { STOCK_REASON_LABEL, type StockMovement, type StockReason } from "@/lib/types";
import { adminFetch, useFeedback } from "./feedback";
import { Card, EmptyState, StockBadge, btnPrimary, inputCls, labelCls } from "./ui";

export interface InventoryRow {
  variantId: string;
  productId: string;
  productName: string;
  productActive: boolean;
  variantName: string;
  sku: string;
  stock: number;
}

type Mode = "in" | "out" | "set";
const REASONS: Record<Mode, StockReason[]> = {
  in: ["restock", "return", "adjustment"],
  out: ["damage", "adjustment"],
  set: ["adjustment", "initial"],
};

export function InventoryManager({ rows, movements, threshold, canAdjust, initialQuery }: { rows: InventoryRow[]; movements: StockMovement[]; threshold: number; canAdjust: boolean; initialQuery: string }) {
  const router = useRouter();
  const { toast } = useFeedback();
  const [q, setQ] = useState(initialQuery);
  const [filter, setFilter] = useState<"" | "low" | "out">("");
  const [active, setActive] = useState<InventoryRow | null>(null);
  const [mode, setMode] = useState<Mode>("in");
  const [qty, setQty] = useState("1");
  const [reason, setReason] = useState<StockReason>("restock");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [historyFor, setHistoryFor] = useState<string | null>(null);

  const list = useMemo(() => {
    const t = q.trim().toLowerCase();
    return rows
      .filter((r) => (!t || `${r.productName} ${r.variantName} ${r.sku}`.toLowerCase().includes(t)) && (!filter || (filter === "out" ? r.stock <= 0 : r.stock > 0 && r.stock <= threshold)))
      .sort((a, b) => a.stock - b.stock || a.productName.localeCompare(b.productName));
  }, [rows, q, filter, threshold]);

  const open = (r: InventoryRow, m: Mode) => {
    setActive(r);
    setMode(m);
    setQty(m === "set" ? String(r.stock) : "1");
    setReason(REASONS[m][0]);
    setNote("");
  };

  const n = Math.floor(Number(qty));
  const preview = active ? (mode === "in" ? active.stock + n : mode === "out" ? active.stock - n : n) : 0;

  const submit = async () => {
    if (!active) return;
    if (!Number.isFinite(n) || n < 0 || (mode !== "set" && n < 1)) return toast("Introduce una cantidad válida.", "error");
    if (preview < 0) return toast(`No puedes retirar más de ${active.stock} unidades.`, "error");
    setBusy(true);
    try {
      await adminFetch("/api/admin/inventory", { method: "POST", json: { variantId: active.variantId, mode, quantity: n, reason, note } });
      toast(`Stock de ${active.productName} · ${active.variantName}: ${active.stock} → ${preview}.`);
      setActive(null);
      router.refresh();
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setBusy(false);
    }
  };

  const shownMovements = historyFor ? movements.filter((m) => m.variantId === historyFor) : movements;

  return (
    <div className="grid gap-6 2xl:grid-cols-[1.7fr_1fr]">
      <div>
        <div className="mb-4 flex flex-wrap gap-3">
          <label className="relative min-w-[220px] flex-1">
            <span className="sr-only">Buscar en inventario</span>
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-steel" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Producto, variante o SKU" className={`${inputCls} pl-9`} />
          </label>
          {([["", "Todo"], ["low", `Stock bajo (≤ ${threshold})`], ["out", "Agotados"]] as const).map(([k, l]) => (
            <button key={k} type="button" aria-pressed={filter === k} onClick={() => setFilter(k)} className={`rounded-full border px-4 text-sm ${filter === k ? "border-blood bg-blood text-white" : "border-bone/15 hover:border-bone/40"}`}>
              {l}
            </button>
          ))}
        </div>
        {list.length === 0 ? (
          <EmptyState title="Sin resultados">No hay variantes con esos filtros.</EmptyState>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-bone/10 bg-white/[0.02]">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b border-bone/10 font-mono text-[10px] uppercase tracking-[0.2em] text-steel">
                <tr><th className="px-4 py-3 font-normal">Producto / variante</th><th className="px-4 py-3 font-normal">SKU</th><th className="px-4 py-3 font-normal">Stock</th><th className="px-4 py-3 font-normal"><span className="sr-only">Acciones</span></th></tr>
              </thead>
              <tbody className="divide-y divide-bone/5">
                {list.map((r) => (
                  <tr key={r.variantId} className={`hover:bg-bone/[0.02] ${active?.variantId === r.variantId ? "bg-blood/5" : ""}`}>
                    <td className="px-4 py-3"><p className="font-medium">{r.productName}{!r.productActive && <span className="ml-2 text-xs text-steel">(oculto)</span>}</p><p className="text-xs text-steel">{r.variantName}</p></td>
                    <td className="px-4 py-3 font-mono text-xs text-steel">{r.sku}</td>
                    <td className="px-4 py-3"><StockBadge stock={r.stock} threshold={threshold} /></td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1.5">
                        {canAdjust && (
                          <>
                            <button type="button" onClick={() => open(r, "in")} className="rounded-full border border-bone/15 p-2 hover:border-emerald-400 hover:text-emerald-300" aria-label={`Entrada de stock: ${r.productName} ${r.variantName}`} title="Entrada"><ArrowDownToLine size={14} /></button>
                            <button type="button" onClick={() => open(r, "out")} disabled={r.stock <= 0} className="rounded-full border border-bone/15 p-2 hover:border-blood hover:text-blood disabled:opacity-30" aria-label={`Salida de stock: ${r.productName} ${r.variantName}`} title="Salida"><ArrowUpFromLine size={14} /></button>
                            <button type="button" onClick={() => open(r, "set")} className="rounded-full border border-bone/15 p-2 hover:border-bone" aria-label={`Recuento: ${r.productName} ${r.variantName}`} title="Recuento"><ClipboardCheck size={14} /></button>
                          </>
                        )}
                        <button type="button" onClick={() => setHistoryFor(historyFor === r.variantId ? null : r.variantId)} aria-pressed={historyFor === r.variantId} className={`rounded-full border p-2 ${historyFor === r.variantId ? "border-blood text-blood" : "border-bone/15 hover:border-bone"}`} aria-label={`Historial: ${r.productName} ${r.variantName}`} title="Historial"><History size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="space-y-6">
        {active && (
          <Card className="space-y-4 border-blood/30 p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-display text-2xl font-black uppercase">{mode === "in" ? "Entrada" : mode === "out" ? "Salida" : "Recuento"}</h2>
                <p className="text-sm text-steel">{active.productName} · {active.variantName} · stock actual {active.stock}</p>
              </div>
              <button type="button" onClick={() => setActive(null)} aria-label="Cerrar" className="rounded-full border border-bone/15 p-1.5"><X size={14} /></button>
            </div>
            <div className="grid grid-cols-3 gap-1 rounded-full border border-bone/10 p-1" role="group" aria-label="Tipo de movimiento">
              {(["in", "out", "set"] as Mode[]).map((m) => (
                <button key={m} type="button" aria-pressed={mode === m} onClick={() => open(active, m)} className={`rounded-full py-1.5 text-xs ${mode === m ? "bg-bone text-ink" : "text-bone/70"}`}>{m === "in" ? "Entrada" : m === "out" ? "Salida" : "Recuento"}</button>
              ))}
            </div>
            <label className="block space-y-1.5"><span className={labelCls}>{mode === "set" ? "Cantidad contada" : "Unidades"}</span><input type="number" min={mode === "set" ? 0 : 1} value={qty} onChange={(e) => setQty(e.target.value)} className={inputCls} /></label>
            <label className="block space-y-1.5">
              <span className={labelCls}>Motivo</span>
              <select value={reason} onChange={(e) => setReason(e.target.value as StockReason)} className={inputCls}>
                {REASONS[mode].map((r) => <option key={r} value={r}>{STOCK_REASON_LABEL[r]}</option>)}
              </select>
            </label>
            <label className="block space-y-1.5"><span className={labelCls}>Nota</span><input value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} placeholder="Proveedor, albarán, motivo…" className={inputCls} /></label>
            <p className={`text-sm ${preview < 0 ? "text-blood" : "text-steel"}`}>Resultado: {active.stock} → <strong className="text-bone">{Number.isFinite(preview) ? preview : "—"}</strong></p>
            <button type="button" disabled={busy} onClick={submit} className={btnPrimary}>Registrar movimiento</button>
          </Card>
        )}
        <Card className="p-6">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="font-display text-2xl font-black uppercase">Movimientos</h2>
            {historyFor && <button type="button" onClick={() => setHistoryFor(null)} className="text-xs text-steel hover:text-bone">Ver todos</button>}
          </div>
          {shownMovements.length === 0 ? (
            <p className="text-sm text-steel">Sin movimientos registrados.</p>
          ) : (
            <ul className="max-h-[560px] divide-y divide-bone/5 overflow-y-auto text-sm">
              {shownMovements.slice(0, 120).map((m) => (
                <li key={m.id} className="py-2.5">
                  <div className="flex justify-between gap-3">
                    <span className="min-w-0 truncate">{m.productName} · {m.variantName}</span>
                    <span className={`shrink-0 tabular-nums ${m.delta > 0 ? "text-emerald-300" : "text-blood"}`}>{m.delta > 0 ? "+" : ""}{m.delta} → {m.stockAfter}</span>
                  </div>
                  <p className="text-xs text-steel">{STOCK_REASON_LABEL[m.reason]}{m.note ? ` · ${m.note}` : ""} · {m.actor} · {formatDate(m.createdAt)}</p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
