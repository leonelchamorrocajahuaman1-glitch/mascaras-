import { NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/server";
import { listModelAssets, prettifyFileName } from "@/lib/models";
import { inspectGltf } from "../../../../../scripts/lib-gltf.mjs";
import { apiError, refreshStore } from "@/lib/api";

const MAX_TOTAL = 60 * 1024 * 1024;
const SAFE_NAME = /^[A-Za-z0-9][A-Za-z0-9._-]{0,120}$/;
const RESOURCE_EXT = /\.(bin|png|jpe?g|webp|ktx2)$/i;

export async function GET(req: Request) {
  const { error } = await requireAdmin(req, "models:view");
  if (error) return error;
  return NextResponse.json({ models: await listModelAssets() });
}

/**
 * Subida de modelos: un .glb, o un .gltf junto con sus recursos (.bin y texturas).
 * El archivo se valida ANTES de guardarse; si no es un glTF 2.0 correcto se rechaza con el detalle.
 */
export async function POST(req: Request) {
  const { error } = await requireAdmin(req, "models:write");
  if (error) return error;

  const form = await req.formData().catch(() => null);
  const files = (form?.getAll("files") ?? []).filter((f): f is File => f instanceof File && f.size > 0);
  if (!files.length) return NextResponse.json({ error: "Selecciona al menos un archivo .glb o .gltf." }, { status: 400 });
  const total = files.reduce((s, f) => s + f.size, 0);
  if (total > MAX_TOTAL) return NextResponse.json({ error: `Los archivos suman ${(total / 1048576).toFixed(1)} MB (máximo 60 MB). Optimiza el modelo con gltf-transform.` }, { status: 413 });

  const mains = files.filter((f) => /\.(glb|gltf)$/i.test(f.name));
  if (mains.length !== 1) return NextResponse.json({ error: "Sube exactamente un archivo .glb o .gltf (más sus recursos si es .gltf)." }, { status: 400 });
  const main = mains[0];
  for (const f of files) {
    if (!SAFE_NAME.test(f.name)) return NextResponse.json({ error: `Renombra "${f.name}" sin espacios ni tildes (solo letras, números, punto, guion y guion bajo).` }, { status: 400 });
    if (f !== main && !RESOURCE_EXT.test(f.name)) return NextResponse.json({ error: `"${f.name}" no es un recurso de glTF admitido (.bin, .png, .jpg, .webp, .ktx2).` }, { status: 400 });
  }
  if (main.name.toLowerCase().endsWith(".glb") && files.length > 1) return NextResponse.json({ error: "Un .glb ya incluye todo: súbelo solo." }, { status: 400 });

  // Validación en una carpeta temporal.
  const tmp = path.join(os.tmpdir(), `sm-model-${randomBytes(6).toString("hex")}`);
  try {
    await fs.mkdir(tmp, { recursive: true });
    const buffers = await Promise.all(files.map(async (f) => ({ name: f.name, data: Buffer.from(await f.arrayBuffer()) })));
    for (const b of buffers) await fs.writeFile(path.join(tmp, b.name), b.data);
    const report = inspectGltf(path.join(tmp, main.name));
    if (!report.ok) return NextResponse.json({ error: "El archivo no es un modelo 3D válido.", issues: report.issues, warnings: report.warnings }, { status: 422 });

    const repo = db();
    const saved = await repo.saveModelFiles(buffers, main.name);
    const str = (k: string) => String(form?.get(k) ?? "").trim().slice(0, 500);
    const asset = await repo.upsertModelAsset({
      fileName: main.name,
      url: saved.url,
      source: repo.kind === "supabase" ? "supabase" : "upload",
      name: str("name") || prettifyFileName(main.name),
      author: str("author"),
      sourceUrl: /^https?:\/\//.test(str("sourceUrl")) ? str("sourceUrl") : "",
      license: str("license"),
      rotationX: 0,
      rotationY: 0,
      sizeBytes: total,
      valid: true,
      issues: [],
      warnings: report.warnings,
      stats: report.stats,
    });

    // Asignación opcional a un producto en el mismo paso.
    const productId = str("productId");
    if (productId) {
      await repo.patchProduct(productId, { modelUrl: asset.url });
      refreshStore();
    }
    return NextResponse.json({ model: asset }, { status: 201 });
  } catch (err) {
    return apiError(err);
  } finally {
    await fs.rm(tmp, { recursive: true, force: true }).catch(() => undefined);
  }
}
