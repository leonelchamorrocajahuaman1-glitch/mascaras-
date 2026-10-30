import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { actorLabel, requireAdmin } from "@/lib/auth/server";
import { orderStatusSchema } from "@/lib/validation";
import { apiError, parseBody, refreshStore } from "@/lib/api";

/** Cambio de estado. Cancelar repone stock y reactivar lo vuelve a descontar (una sola vez). */
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireAdmin(req, "orders:update");
  if (error) return error;
  const body = await parseBody(req, orderStatusSchema);
  if (body.error) return body.error;
  try {
    const order = await db().updateOrderStatus((await ctx.params).id, body.data.status, actorLabel(session), body.data.note);
    refreshStore();
    return NextResponse.json({ order });
  } catch (err) {
    return apiError(err);
  }
}
