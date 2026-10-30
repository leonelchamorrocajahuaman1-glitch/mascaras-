import type { StoreSettings } from "./types";

/** Subconjunto público de la configuración (nunca incluye datos internos). Usable en servidor y cliente. */
export type PublicSettings = Pick<StoreSettings, "shippingCents" | "freeShippingFromCents" | "maxQuantityPerItem" | "lowStockThreshold" | "ordersEnabled" | "checkoutNotice">;

export function toPublicSettings(s: StoreSettings | Omit<StoreSettings, "updatedAt">): PublicSettings {
  return {
    shippingCents: s.shippingCents,
    freeShippingFromCents: s.freeShippingFromCents,
    maxQuantityPerItem: s.maxQuantityPerItem,
    lowStockThreshold: s.lowStockThreshold,
    ordersEnabled: s.ordersEnabled,
    checkoutNotice: s.checkoutNotice,
  };
}

export function shippingFor(subtotalCents: number, s: Pick<PublicSettings, "shippingCents" | "freeShippingFromCents">) {
  if (subtotalCents <= 0) return 0;
  return subtotalCents >= s.freeShippingFromCents ? 0 : s.shippingCents;
}
