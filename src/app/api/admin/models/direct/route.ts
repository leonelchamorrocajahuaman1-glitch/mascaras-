import { NextResponse } from "next/server";
import { z } from "zod";
import { db, isSupabaseConfigured } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/server";
import { prettifyFileName } from "@/lib/models";
import { completeDirectUpload, prepareDirectUpload } from "@/lib/storage-direct";
import { apiError, parseBody, refreshStore } from "@/lib/api";

// La validación descarga el modelo desde Storage: puede tardar con archivos grandes.
export const maxDuration = 60;

const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("prepare"), files: z.array(z.object({ name: z.string().max(130), size: z.number().int().min(1) })).min(1).max(20) }),
  z.object({
    action: z.literal("complete"),
    folder: z.string().max(40),
    main: z.string().max(130),
    name: z.string().trim().max(80).default(""),
    author: z.string().trim().max(120).default(""),
    sourceUrl: z.string().trim().max(500).default(""),
    license: z.string().trim().max(160).default(""),
    productId: z.string().max(64).default(""),
  }),
]);

/** Subida directa a Supabase Storage (producción). En modo local se usa POST /api/admin/models. */
export async function POST(req: Request) {
  const { error } = await requireAdmin(req, "models:write");
  if (error) return error;
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "La subida directa requiere Supabase." }, { status: 400 });
  const body = await parseBody(req, schema);
  if (body.error) return body.error;
  try {
    if (body.data.action === "prepare") return NextResponse.json(await prepareDirectUpload(body.data.files));

    const { folder, main, name, author, sourceUrl, license, productId } = body.data;
    const done = await completeDirectUpload(folder, main);
    if (!done.url) return NextResponse.json({ error: "El archivo no es un modelo 3D válido.", issues: done.report.issues, warnings: done.report.warnings }, { status: 422 });
    const repo = db();
    const model = await repo.upsertModelAsset({
      fileName: main,
      url: done.url,
      source: "supabase",
      name: name || prettifyFileName(main),
      author,
      sourceUrl: /^https?:\/\//.test(sourceUrl) ? sourceUrl : "",
      license,
      rotationX: 0,
      rotationY: 0,
      sizeBytes: done.sizeBytes,
      valid: true,
      issues: [],
      warnings: done.report.warnings,
      stats: done.report.stats,
    });
    if (productId) {
      await repo.patchProduct(productId, { modelUrl: model.url });
      refreshStore();
    }
    return NextResponse.json({ model }, { status: 201 });
  } catch (err) {
    return apiError(err);
  }
}
