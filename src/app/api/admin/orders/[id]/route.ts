import { NextResponse } from "next/server";
import { db, DbError } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/server";
import { firstIssue, orderStatusSchema } from "@/lib/validation";

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { error } = await requireAdmin(req);
  if (error) return error;
  const { id } = await ctx.params;
  const parsed = orderStatusSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: firstIssue(parsed.error) }, { status: 400 });
  try {
    const order = await db().updateOrderStatus(id, parsed.data.status);
    return NextResponse.json({ order });
  } catch (err) {
    if (err instanceof DbError) return NextResponse.json({ error: err.message }, { status: err.status });
    throw err;
  }
}
