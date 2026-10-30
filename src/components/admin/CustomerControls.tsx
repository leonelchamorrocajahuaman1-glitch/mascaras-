"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Customer } from "@/lib/types";
import { adminFetch, useFeedback } from "./feedback";
import { btnGhost, btnPrimary, inputCls, labelCls } from "./ui";

export function CustomerControls({ customer, canManage }: { customer: Customer; canManage: boolean }) {
  const router = useRouter();
  const { toast, confirm } = useFeedback();
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState(customer.adminNotes);
  const [busy, setBusy] = useState(false);

  const patch = async (body: Record<string, unknown>, msg: string) => {
    setBusy(true);
    try {
      await adminFetch(`/api/admin/customers/${customer.id}`, { method: "PATCH", json: body });
      toast(msg);
      router.refresh();
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setBusy(false);
    }
  };

  if (!canManage) return <p className="text-xs text-steel">Tu rol solo permite consultar clientes.</p>;
  return (
    <div className="space-y-5">
      {customer.status === "active" ? (
        <div className="space-y-2">
          <label className="block space-y-1.5">
            <span className={labelCls}>Motivo de la suspensión</span>
            <input value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} placeholder="p. ej. pedidos fraudulentos repetidos" className={inputCls} />
          </label>
          <button
            type="button"
            disabled={busy || reason.trim().length < 3}
            className={`${btnGhost} hover:border-blood hover:text-blood`}
            onClick={async () => (await confirm({ title: "Suspender cliente", body: "No podrá realizar pedidos nuevos con este email. Sus pedidos existentes no cambian.", danger: true, confirmLabel: "Suspender" })) && patch({ status: "suspended", suspendedReason: reason.trim() }, "Cliente suspendido.")}
          >
            Suspender cliente
          </button>
        </div>
      ) : (
        <button type="button" disabled={busy} className={btnPrimary} onClick={() => patch({ status: "active" }, "Cliente reactivado.")}>
          Reactivar cliente
        </button>
      )}
      <div className="space-y-2">
        <label className="block space-y-1.5">
          <span className={labelCls}>Notas internas (no las ve el cliente)</span>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} maxLength={2000} className={`${inputCls} h-auto py-2`} />
        </label>
        <button type="button" disabled={busy || notes === customer.adminNotes} className={btnGhost} onClick={() => patch({ adminNotes: notes }, "Notas guardadas.")}>
          Guardar notas
        </button>
      </div>
    </div>
  );
}
