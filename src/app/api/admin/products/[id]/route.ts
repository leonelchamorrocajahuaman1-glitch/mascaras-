import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { db, DbError } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/server";
import { firstIssue, productInputSchema } from "@/lib/validation";

type Ctx = { params: Promise<{ id: string }> };

export async function PUT(req: Request, ctx: Ctx) {
  const { error } = await requireAdmin(req);
  if (error) return error;
  const { id } = await ctx.params;
  const parsed = productInputSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: firstIssue(parsed.error) }, { status: 400 });
  try {
    const product = await db().updateProduct(id, parsed.data);
    revalidatePath("/", "layout");
    return NextResponse.json({ product });
  } catch (err) {
    if (err instanceof DbError) return NextResponse.json({ error: err.message }, { status: err.status });
    throw err;
  }
}

export async function DELETE(req: Request, ctx: Ctx) {
  const { error } = await requireAdmin(req);
  if (error) return error;
  const { id } = await ctx.params;
  try {
    await db().deleteProduct(id);
    revalidatePath("/", "layout");
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof DbError) return NextResponse.json({ error: err.message }, { status: err.status });
    throw err;
  }
}
