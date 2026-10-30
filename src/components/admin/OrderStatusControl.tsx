"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { ORDER_STATUSES, ORDER_STATUS_LABEL, type OrderStatus } from "@/lib/types";

export function OrderStatusControl({ id, status }: { id: string; status: OrderStatus }) {
  const router = useRouter();
  const [value, setValue] = useState(status);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const save = async (next: OrderStatus) => {
    if (next === "cancelled" && !window.confirm("¿Cancelar el pedido? Se repondrá el stock de sus productos.")) return;
    setBusy(true);
    setMsg(null);
    const res = await fetch(`/api/admin/orders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setMsg({ ok: false, text: data.error ?? "No se pudo actualizar." });
      return;
    }
    setValue(next);
    setMsg({ ok: true, text: `Estado actualizado: ${ORDER_STATUS_LABEL[next]}` });
    router.refresh();
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2" role="group" aria-label="Estado del pedido">
        {ORDER_STATUSES.map((s) => (
          <button
            key={s}
            type="button"
            disabled={busy || s === value}
            onClick={() => save(s)}
            aria-pressed={s === value}
            className={`rounded-full border px-4 py-2 text-sm transition ${s === value ? "border-blood bg-blood text-white" : "border-bone/15 hover:border-bone/50"} disabled:cursor-default`}
          >
            {ORDER_STATUS_LABEL[s]}
          </button>
        ))}
        {busy && <Loader2 size={16} className="mt-2 animate-spin text-steel" />}
      </div>
      {msg && <p role="status" className={`text-sm ${msg.ok ? "text-emerald-300" : "text-blood"}`}>{msg.text}</p>}
    </div>
  );
}
