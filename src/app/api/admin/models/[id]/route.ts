import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/server";
import { modelMetaSchema } from "@/lib/validation";
import { apiError, parseBody, refreshStore } from "@/lib/api";

type Ctx = { params: Promise<{ id: string }> };

/** Edita nombre, autor, origen, licencia y orientación. */
export async function PATCH(req: Request, ctx: Ctx) {
  const { error } = await requireAdmin(req, "models:write");
  if (error) return error;
  const body = await parseBody(req, modelMetaSchema);
  if (body.error) return body.error;
  try {
    const model = await db().updateModelMeta((await ctx.params).id, body.data);
    refreshStore();
    return NextResponse.json({ model });
  } catch (err) {
    return apiError(err);
  }
}

/** Elimina el registro (y los archivos subidos desde el panel). Los productos que lo usaban quedan sin modelo, no se borran. */
export async function DELETE(req: Request, ctx: Ctx) {
  const { error } = await requireAdmin(req, "models:write");
  if (error) return error;
  try {
    const repo = db();
    const asset = await repo.deleteModelAsset((await ctx.params).id);
    await repo.removeModelFiles(asset);
    refreshStore();
    return NextResponse.json({
      ok: true,
      note: asset.source === "public" ? `El archivo sigue en public/models/${asset.fileName}: bórralo a mano o se volverá a registrar.` : undefined,
    });
  } catch (err) {
    return apiError(err);
  }
}
