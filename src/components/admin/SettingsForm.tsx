"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Save } from "lucide-react";
import type { StoreSettings } from "@/lib/types";
import { adminFetch, useFeedback } from "./feedback";
import { Card, btnPrimary, inputCls, labelCls } from "./ui";

const money = (c: number) => (c / 100).toFixed(2);
const cents = (v: string) => Math.round(Number(v.replace(",", ".")) * 100);

export function SettingsForm({ settings, canWrite }: { settings: StoreSettings; canWrite: boolean }) {
  const router = useRouter();
  const { toast } = useFeedback();
  const [s, setS] = useState({
    storeName: settings.storeName,
    contactEmail: settings.contactEmail,
    shipping: money(settings.shippingCents),
    freeFrom: money(settings.freeShippingFromCents),
    lowStockThreshold: String(settings.lowStockThreshold),
    maxQuantityPerItem: String(settings.maxQuantityPerItem),
    ordersEnabled: settings.ordersEnabled,
    checkoutNotice: settings.checkoutNotice,
  });
  const [busy, setBusy] = useState(false);

  const save = async () => {
    const body = {
      storeName: s.storeName,
      contactEmail: s.contactEmail,
      shippingCents: cents(s.shipping),
      freeShippingFromCents: cents(s.freeFrom),
      lowStockThreshold: Number(s.lowStockThreshold),
      maxQuantityPerItem: Number(s.maxQuantityPerItem),
      ordersEnabled: s.ordersEnabled,
      checkoutNotice: s.checkoutNotice,
    };
    if ([body.shippingCents, body.freeShippingFromCents].some((v) => !Number.isFinite(v) || v < 0)) return toast("Revisa los importes de envío.", "error");
    if (!Number.isInteger(body.lowStockThreshold) || !Number.isInteger(body.maxQuantityPerItem) || body.maxQuantityPerItem < 1) return toast("Revisa el umbral de stock y el máximo por artículo.", "error");
    setBusy(true);
    try {
      await adminFetch("/api/admin/settings", { method: "PUT", json: body });
      toast("Configuración guardada. La tienda ya usa los nuevos valores.");
      router.refresh();
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setBusy(false);
    }
  };

  const field = (key: keyof typeof s, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <label className="block space-y-1.5">
      <span className={labelCls}>{label}</span>
      <input value={String(s[key])} onChange={(e) => setS({ ...s, [key]: e.target.value })} disabled={!canWrite} className={inputCls} {...props} />
    </label>
  );

  return (
    <Card className="space-y-5 p-6">
      <h2 className="font-display text-2xl font-black uppercase">Tienda</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        {field("storeName", "Nombre de la tienda")}
        {field("contactEmail", "Email de contacto", { type: "email", placeholder: "opcional" })}
        {field("shipping", "Envío (USD)", { inputMode: "decimal" })}
        {field("freeFrom", "Envío gratis desde (USD)", { inputMode: "decimal" })}
        {field("lowStockThreshold", "Alerta de stock bajo (uds)", { type: "number", min: 0 })}
        {field("maxQuantityPerItem", "Máximo por artículo en un pedido", { type: "number", min: 1 })}
      </div>
      <label className="flex items-start gap-3 rounded-xl border border-bone/10 p-4 text-sm">
        <input type="checkbox" checked={s.ordersEnabled} disabled={!canWrite} onChange={(e) => setS({ ...s, ordersEnabled: e.target.checked })} className="mt-0.5 h-4 w-4 accent-[#e1121f]" />
        <span>
          <strong>Aceptar pedidos</strong>
          <span className="block text-steel">Si lo desactivas, la tienda sigue visible pero el checkout no registra pedidos nuevos (lo comprueba el servidor).</span>
        </span>
      </label>
      <label className="block space-y-1.5">
        <span className={labelCls}>Aviso del checkout (instrucciones de pago para el cliente)</span>
        <textarea value={s.checkoutNotice} disabled={!canWrite} onChange={(e) => setS({ ...s, checkoutNotice: e.target.value })} rows={3} maxLength={600} className={`${inputCls} h-auto py-2`} />
      </label>
      {canWrite ? (
        <button type="button" disabled={busy} onClick={save} className={btnPrimary}><Save size={15} /> Guardar configuración</button>
      ) : (
        <p className="text-xs text-steel">Tu rol solo permite consultar la configuración.</p>
      )}
    </Card>
  );
}
