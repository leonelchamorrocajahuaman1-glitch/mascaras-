import type { AdminRole } from "../types";

/** Mapa de permisos. El servidor lo comprueba en cada ruta; la interfaz solo lo usa para ocultar opciones. */
export const PERMISSIONS = {
  "dashboard:view": ["owner", "admin", "staff"],
  "products:view": ["owner", "admin", "staff"],
  "products:write": ["owner", "admin"],
  "products:delete": ["owner", "admin"],
  "categories:write": ["owner", "admin"],
  "models:view": ["owner", "admin", "staff"],
  "models:write": ["owner", "admin"],
  "orders:view": ["owner", "admin", "staff"],
  "orders:update": ["owner", "admin", "staff"],
  "orders:payment": ["owner", "admin"],
  "orders:cleanup": ["owner"],
  "customers:view": ["owner", "admin", "staff"],
  "customers:manage": ["owner", "admin"],
  "inventory:view": ["owner", "admin", "staff"],
  "inventory:adjust": ["owner", "admin", "staff"],
  "settings:write": ["owner", "admin"],
  "users:manage": ["owner"],
} as const satisfies Record<string, readonly AdminRole[]>;

export type Permission = keyof typeof PERMISSIONS;

export function can(role: AdminRole | undefined | null, permission: Permission) {
  return Boolean(role && (PERMISSIONS[permission] as readonly AdminRole[]).includes(role));
}

export const ROLE_DESCRIPTION: Record<AdminRole, string> = {
  owner: "Acceso total. Definido en .env.local; es el único que gestiona usuarios del panel.",
  admin: "Gestiona productos, categorías, modelos 3D, pedidos, pagos, clientes, inventario y configuración.",
  staff: "Consulta todo y gestiona estados de pedidos e inventario. No edita productos, precios ni configuración.",
};
