import "server-only";
import type { Order, Product, StoreSettings } from "./types";

export interface SeriesPoint {
  key: string;
  label: string;
  amountCents: number;
  orders: number;
}

const pad = (n: number) => String(n).padStart(2, "0");
const dayKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const monthKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
const MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

/**
 * Métricas del negocio calculadas a partir de los datos reales.
 * "Importe" = pedidos no cancelados (sin pedidos de prueba). "Cobrado" = pedidos con pago confirmado.
 */
export function computeStats(orders: Order[], products: Product[], settings: StoreSettings, now = new Date()) {
  const real = orders.filter((o) => !o.isTest);
  const valid = real.filter((o) => o.status !== "cancelled");
  const today = dayKey(now);
  const month = monthKey(now);
  const sum = (list: Order[]) => list.reduce((s, o) => s + o.totalCents, 0);

  const variants = products.filter((p) => p.active).flatMap((p) => p.variants.map((v) => ({ product: p, variant: v })));
  const lowStock = variants.filter(({ variant }) => variant.stock > 0 && variant.stock <= settings.lowStockThreshold);
  const outOfStock = variants.filter(({ variant }) => variant.stock <= 0);

  // Serie diaria (30 días) y mensual (12 meses), con huecos a cero.
  const daily: SeriesPoint[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    daily.push({ key: dayKey(d), label: `${d.getDate()} ${MONTHS[d.getMonth()]}`, amountCents: 0, orders: 0 });
  }
  const monthly: SeriesPoint[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    monthly.push({ key: monthKey(d), label: `${MONTHS[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`, amountCents: 0, orders: 0 });
  }
  const byDay = new Map(daily.map((p) => [p.key, p]));
  const byMonth = new Map(monthly.map((p) => [p.key, p]));
  for (const o of valid) {
    const d = new Date(o.createdAt);
    const dp = byDay.get(dayKey(d));
    if (dp) {
      dp.amountCents += o.totalCents;
      dp.orders += 1;
    }
    const mp = byMonth.get(monthKey(d));
    if (mp) {
      mp.amountCents += o.totalCents;
      mp.orders += 1;
    }
  }

  return {
    totalSalesCents: sum(valid),
    todayCents: sum(valid.filter((o) => dayKey(new Date(o.createdAt)) === today)),
    monthCents: sum(valid.filter((o) => monthKey(new Date(o.createdAt)) === month)),
    collectedCents: sum(real.filter((o) => o.paymentStatus === "paid")),
    ordersCount: real.length,
    ordersToday: real.filter((o) => dayKey(new Date(o.createdAt)) === today).length,
    pendingOrders: real.filter((o) => o.status === "pending").length,
    cancelledOrders: real.filter((o) => o.status === "cancelled").length,
    productsActive: products.filter((p) => p.active).length,
    productsAvailable: products.filter((p) => p.active && p.variants.some((v) => v.stock > 0)).length,
    productsInactive: products.filter((p) => !p.active).length,
    lowStock,
    outOfStock,
    productsWithoutModel: products.filter((p) => !p.modelUrl).length,
    recent: real.slice(0, 8),
    daily,
    monthly,
    testOrders: orders.length - real.length,
  };
}
