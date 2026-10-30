import { NextResponse } from "next/server";
import { db, DbError } from "@/lib/db";
import { firstIssue, placeOrderSchema } from "@/lib/validation";
import { rateLimit } from "@/lib/auth/rate-limit";
import { clientIp } from "@/lib/auth/server";

export async function POST(req: Request) {
  const limit = rateLimit(`order:${clientIp(req)}`, 10, 10 * 60 * 1000);
  if (!limit.ok) return NextResponse.json({ error: "Demasiados pedidos seguidos. Inténtalo más tarde." }, { status: 429 });

  const body = await req.json().catch(() => null);
  const parsed = placeOrderSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: firstIssue(parsed.error) }, { status: 400 });

  try {
    const order = await db().placeOrder(parsed.data);
    return NextResponse.json({ id: order.id, number: order.number }, { status: 201 });
  } catch (err) {
    if (err instanceof DbError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error(err);
    return NextResponse.json({ error: "No se pudo registrar el pedido." }, { status: 500 });
  }
}
