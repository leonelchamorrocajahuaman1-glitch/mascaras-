"use client";

import { createContext, useContext } from "react";
import { DEFAULT_SETTINGS } from "../defaults";
import { toPublicSettings, type PublicSettings } from "../public-settings";

export type { PublicSettings } from "../public-settings";
export { shippingFor } from "../public-settings";

const Ctx = createContext<PublicSettings>(toPublicSettings(DEFAULT_SETTINGS));

/** Configuración pública de la tienda leída de la base de datos en el servidor (envío, límites, avisos). */
export function StoreSettingsProvider({ value, children }: { value: PublicSettings; children: React.ReactNode }) {
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useStoreSettings = () => useContext(Ctx);
