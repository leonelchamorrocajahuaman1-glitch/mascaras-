import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/server";
import { customerPatchSchema } from "@/lib/validation";
import { apiError, parseBody } from "@/lib/api";

/** Suspender / reactivar cliente y notas internas. Un cliente suspendido no puede hacer pedidos (lo comprueba el servidor). */
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { error } = await requireAdmin(req, "customers:manage");
  if (error) return error;
  const body = await parseBody(req, customerPatchSchema);
  if (body.error) return body.error;
  try {
    const customer = await db().updateCustomer((await ctx.params).id, body.data);
    return NextResponse.json({ customer });
  } catch (err) {
    return apiError(err);
  }
}
