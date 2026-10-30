import { MASKS } from "./masks";
import type { StoreSettings } from "./types";

/** Valores iniciales de la configuración (editables en /admin/configuracion). */
export const DEFAULT_SETTINGS: Omit<StoreSettings, "updatedAt"> = {
  storeName: "SPIDER MASKS",
  contactEmail: "",
  shippingCents: 1200,
  freeShippingFromCents: 25000,
  lowStockThreshold: 3,
  maxQuantityPerItem: 10,
  ordersEnabled: true,
  checkoutNotice:
    "No hay una pasarela de pago integrada: tu pedido queda registrado como pendiente y no se realiza ningún cobro en la web.",
};

/** Categorías iniciales: una por edición de la colección. */
export function seedCategories() {
  const now = new Date().toISOString();
  return MASKS.map((m, i) => ({
    id: `cat_${m.key.replace(/-/g, "_")}`,
    slug: m.key,
    name: m.name,
    description: m.tagline,
    sortOrder: i,
    active: true,
    createdAt: now,
    updatedAt: now,
  }));
}
