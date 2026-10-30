import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { actorLabel, requireAdmin } from "@/lib/auth/server";
import { productInputSchema, productPatchSchema } from "@/lib/validation";
import { apiError, parseBody, refreshStore } from "@/lib/api";

type Ctx = { params: Promise<{ id: string }> };

/** Edición completa desde el formulario. */
export async function PUT(req: Request, ctx: Ctx) {
  const { session, error } = await requireAdmin(req, "products:write");
  if (error) return error;
  const body = await parseBody(req, productInputSchema);
  if (body.error) return body.error;
  try {
    const product = await db().updateProduct((await ctx.params).id, body.data, actorLabel(session));
    refreshStore();
    return NextResponse.json({ product });
  } catch (err) {
    return apiError(err);
  }
}

/** Cambios rápidos: activar/desactivar, destacar, asignar o quitar modelo 3D. */
export async function PATCH(req: Request, ctx: Ctx) {
  const { error } = await requireAdmin(req, "products:write");
  if (error) return error;
  const body = await parseBody(req, productPatchSchema);
  if (body.error) return body.error;
  try {
    if (body.data.modelUrl) {
      const model = (await db().listModelAssets()).find((m) => m.url === body.data.modelUrl);
      if (!model) return NextResponse.json({ error: "Ese modelo no está registrado." }, { status: 400 });
      if (!model.valid) return NextResponse.json({ error: "El modelo tiene errores de validación y no se puede asignar." }, { status: 400 });
    }
    const product = await db().patchProduct((await ctx.params).id, body.data);
    refreshStore();
    return NextResponse.json({ product });
  } catch (err) {
    return apiError(err);
  }
}

export async function DELETE(req: Request, ctx: Ctx) {
  const { error } = await requireAdmin(req, "products:delete");
  if (error) return error;
  try {
    await db().deleteProduct((await ctx.params).id);
    refreshStore();
    return NextResponse.json({ ok: true });
  } catch (err) {
    return apiError(err);
  }
}
