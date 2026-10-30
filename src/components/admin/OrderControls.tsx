"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { ORDER_STATUSES, ORDER_STATUS_LABEL, PAYMENT_METHODS, PAYMENT_METHOD_LABEL, type Order, type OrderStatus, type PaymentMethod } from "@/lib/types";
import { adminFetch, useFeedback } from "./feedback";
import { btnGhost, btnPrimary, inputCls, labelCls } from "./ui";

export function OrderStatusControl({ order }: { order: Pick<Order, "id" | "status"> }) {
  const router = useRouter();
  const { toast, confirm } = useFeedback();
  const [busy, setBusy] = useState<OrderStatus | null>(null);
  const [note, setNote] = useState("");

  const set = async (status: OrderStatus) => {
    if (status === "cancelled" && !(await confirm({ title: "Cancelar pedido", body: "Se repondrá el stock de todos sus artículos. El cliente verá el pedido como cancelado.", confirmLabel: "Cancelar pedido", danger: true }))) return;
    if (order.status === "cancelled" && !(await confirm({ title: "Reactivar pedido", body: "Se volverá a descontar el stock de sus artículos (si hay existencias suficientes)." }))) return;
    setBusy(status);
    try {
      await adminFetch(`/api/admin/orders/${order.id}`, { method: "PATCH", json: { status, note: note || undefined } });
      toast(`Estado actualizado: ${ORDER_STATUS_LABEL[status]}.`);
      setNote("");
      router.refresh();
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2" role="group" aria-label="Estado del pedido">
        {ORDER_STATUSES.map((s) => (
          <button
            key={s}
            type="button"
            disabled={busy !== null || s === order.status}
            onClick={() => set(s)}
            aria-pressed={s === order.status}
            className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm transition ${s === order.status ? "border-blood bg-blood text-white" : s === "cancelled" ? "border-bone/15 hover:border-blood hover:text-blood" : "border-bone/15 hover:border-bone/50"} disabled:cursor-default`}
          >
            {busy === s && <Loader2 size={13} className="animate-spin" />} {ORDER_STATUS_LABEL[s]}
          </button>
        ))}
      </div>
      <label className="block space-y-1.5">
        <span className={labelCls}>Nota interna para el historial (opcional)</span>
        <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} placeholder="p. ej. nº de seguimiento del envío" className={inputCls} />
      </label>
    </div>
  );
}

export function OrderPaymentControl({ order, canPay }: { order: Pick<Order, "id" | "paymentStatus" | "paymentMethod" | "paymentRef">; canPay: boolean }) {
  const router = useRouter();
  const { toast, confirm } = useFeedback();
  const [method, setMethod] = useState<PaymentMethod>("bank_transfer");
  const [reference, setReference] = useState("");
  const [busy, setBusy] = useState(false);

  const send = async (action: "paid" | "refunded" | "unpaid", m: PaymentMethod, msg: string) => {
    setBusy(true);
    try {
      await adminFetch(`/api/admin/orders/${order.id}/payment`, { method: "POST", json: { action, method: m, reference } });
      toast(msg);
      setReference("");
      router.refresh();
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setBusy(false);
    }
  };

  if (!canPay) return <p className="text-xs text-steel">Tu rol no puede registrar cobros.</p>;

  if (order.paymentStatus === "paid") {
    return (
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={busy} className={btnGhost} onClick={async () => (await confirm({ title: "Registrar reembolso", body: "Marca el pedido como reembolsado. Esta web no devuelve dinero: haz el reembolso por el mismo medio del cobro.", danger: true, confirmLabel: "Marcar reembolsado" })) && send("refunded", order.paymentMethod, "Reembolso registrado.")}>
          Registrar reembolso
        </button>
        <button type="button" disabled={busy} className={btnGhost} onClick={async () => (await confirm({ title: "Deshacer cobro", body: "Vuelve a marcar el pedido como no pagado (por ejemplo, si el cobro se registró por error)." })) && send("unpaid", "none", "Cobro anulado.")}>
          Deshacer cobro
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs leading-relaxed text-steel">
        No hay pasarela de pago integrada. Registra aquí un cobro <strong className="text-bone">solo cuando lo hayas recibido</strong> por otro medio (transferencia, efectivo, TPV).
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="space-y-1.5">
          <span className={labelCls}>Método</span>
          <select value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)} className={inputCls}>
            {PAYMENT_METHODS.filter((m) => m !== "none").map((m) => <option key={m} value={m}>{PAYMENT_METHOD_LABEL[m]}</option>)}
          </select>
        </label>
        <label className="space-y-1.5">
          <span className={labelCls}>Referencia</span>
          <input value={reference} onChange={(e) => setReference(e.target.value)} maxLength={120} placeholder="nº de operación o recibo" className={inputCls} />
        </label>
      </div>
      <button
        type="button"
        disabled={busy}
        className={btnPrimary}
        onClick={async () => (await confirm({ title: "Confirmar cobro recibido", body: `Se marcará como pagado por ${PAYMENT_METHOD_LABEL[method]}${reference ? ` (ref. ${reference})` : ""}. Hazlo solo si el dinero ya está recibido.`, confirmLabel: "Sí, cobro recibido" })) && send("paid", method, "Cobro registrado.")}
      >
        Registrar cobro recibido
      </button>
    </div>
  );
}
