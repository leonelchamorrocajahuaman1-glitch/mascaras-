import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/server";
import { hashPassword } from "@/lib/auth/password";
import { adminUserPatchSchema } from "@/lib/validation";
import { apiError, parseBody } from "@/lib/api";
import { publicUser } from "@/lib/admin-users";

/** Eliminar un usuario del panel (sus sesiones dejan de ser válidas al no existir). */
export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { error } = await requireAdmin(req, "users:manage");
  if (error) return error;
  try {
    await db().deleteAdminUser((await ctx.params).id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return apiError(err);
  }
}

/** Cambiar nombre, rol, contraseña o desactivar. Cualquier cambio de seguridad cierra las sesiones abiertas de ese usuario. */
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { error } = await requireAdmin(req, "users:manage");
  if (error) return error;
  const body = await parseBody(req, adminUserPatchSchema);
  if (body.error) return body.error;
  try {
    const { password, ...rest } = body.data;
    const user = await db().updateAdminUser((await ctx.params).id, { ...rest, ...(password ? { passwordHash: await hashPassword(password) } : {}) });
    return NextResponse.json({ user: publicUser(user) });
  } catch (err) {
    return apiError(err);
  }
}
