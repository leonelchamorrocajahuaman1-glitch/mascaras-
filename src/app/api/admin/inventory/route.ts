import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { actorLabel, requireAdmin } from "@/lib/auth/server";
import { stockAdjustSchema } from "@/lib/validation";
import { apiError, parseBody, refreshStore } from "@/lib/api";

export async function GET(req: Request) {
  const { error } = await requireAdmin(req, "inventory:view");
  if (error) return error;
  const variantId = new URL(req.url).searchParams.get("variantId") ?? undefined;
  return NextResponse.json({ movements: await db().listMovements({ variantId, limit: 300 }) });
}

/** Entrada, salida o recuento. Operación atómica que deja registro del movimiento y de quién lo hizo. */
export async function POST(req: Request) {
  const { session, error } = await requireAdmin(req, "inventory:adjust");
  if (error) return error;
  const body = await parseBody(req, stockAdjustSchema);
  if (body.error) return body.error;
  if (body.data.mode !== "set" && body.data.quantity < 1) return NextResponse.json({ error: "La cantidad debe ser al menos 1." }, { status: 400 });
  try {
    const movement = await db().adjustStock(body.data, actorLabel(session));
    refreshStore();
    return NextResponse.json({ movement }, { status: 201 });
  } catch (err) {
    return apiError(err);
  }
}
