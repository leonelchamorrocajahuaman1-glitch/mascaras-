import type { AdminUser, PublicAdminUser } from "./types";

/** Nunca se envía el hash de la contraseña al navegador. */
export const publicUser = ({ passwordHash: _p, ...u }: AdminUser): PublicAdminUser => u;
