import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { actorLabel, requireAdmin } from "@/lib/auth/server";
import { orderPaymentSchema } from "@/lib/validation";
import { apiError, parseBody } from "@/lib/api";

/**
 * Registro manual de cobros recibidos FUERA de la web (transferencia, efectivo, TPV) o de un reembolso.
 * No hay pasarela integrada: la web nunca marca un pedido como pagado por sí sola.
 */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireAdmin(req, "orders:payment");
  if (error) return error;
  const body = await parseBody(req, orderPaymentSchema);
  if (body.error) return body.error;
  try {
    const order = await db().recordPayment((await ctx.params).id, body.data, actorLabel(session));
    return NextResponse.json({ order });
  } catch (err) {
    return apiError(err);
  }
}
