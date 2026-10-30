import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/server";
import { categoryInputSchema } from "@/lib/validation";
import { apiError, parseBody, refreshStore } from "@/lib/api";

type Ctx = { params: Promise<{ id: string }> };

export async function PUT(req: Request, ctx: Ctx) {
  const { error } = await requireAdmin(req, "categories:write");
  if (error) return error;
  const body = await parseBody(req, categoryInputSchema);
  if (body.error) return body.error;
  try {
    const category = await db().updateCategory((await ctx.params).id, body.data);
    refreshStore();
    return NextResponse.json({ category });
  } catch (err) {
    return apiError(err);
  }
}

export async function DELETE(req: Request, ctx: Ctx) {
  const { error } = await requireAdmin(req, "categories:write");
  if (error) return error;
  try {
    await db().deleteCategory((await ctx.params).id);
    refreshStore();
    return NextResponse.json({ ok: true });
  } catch (err) {
    return apiError(err);
  }
}
