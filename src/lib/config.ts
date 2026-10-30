/** Configuración pública de la tienda (no contiene secretos). */
export const siteConfig = {
  name: "SPIDER MASKS",
  slogan: "BEHIND THE MASK.",
  description:
    "Una experiencia digital dedicada al universo de las máscaras arácnidas: estética oscura, futurista y cinematográfica.",
  currency: "USD",
  locale: "es-ES",
  /** Formato de precio: "en-US" muestra $149. */
  moneyLocale: "en-US",
  /** Envío plano demostrativo, en céntimos. */
  shippingCents: 1200,
  /** Envío gratuito a partir de este subtotal (céntimos). */
  freeShippingFromCents: 25000,
  maxQuantityPerItem: 10,
};

export function shippingFor(subtotalCents: number) {
  if (subtotalCents <= 0) return 0;
  return subtotalCents >= siteConfig.freeShippingFromCents ? 0 : siteConfig.shippingCents;
}
