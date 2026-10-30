import "server-only";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { supabaseAdmin } from "./db/supabase";
import { DbError } from "./db";
import { inspectGltf, type GltfInspection } from "../../scripts/lib-gltf.mjs";

/**
 * Subida directa navegador → Supabase Storage para modelos 3D grandes.
 * Vercel limita el cuerpo de cada petición a ~4,5 MB, así que el archivo nunca pasa por la función:
 * el servidor firma URLs de subida de un solo uso y después descarga, valida y registra el modelo.
 */
const BUCKET = "models";
export const SAFE_NAME = /^[A-Za-z0-9][A-Za-z0-9._-]{0,120}$/;
export const RESOURCE_EXT = /\.(bin|png|jpe?g|webp|ktx2)$/i;
export const MAX_MODEL_BYTES = 60 * 1024 * 1024;

export function validateModelFileList(files: { name: string; size: number }[]) {
  if (!files.length) throw new DbError("Selecciona al menos un archivo .glb o .gltf.", 400);
  const total = files.reduce((s, f) => s + f.size, 0);
  if (total > MAX_MODEL_BYTES) throw new DbError(`Los archivos suman ${(total / 1048576).toFixed(1)} MB (máximo 60 MB). Optimiza el modelo con gltf-transform.`, 413);
  const mains = files.filter((f) => /\.(glb|gltf)$/i.test(f.name));
  if (mains.length !== 1) throw new DbError("Sube exactamente un archivo .glb o .gltf (más sus recursos si es .gltf).", 400);
  for (const f of files) {
    if (!SAFE_NAME.test(f.name)) throw new DbError(`Renombra "${f.name}" sin espacios ni tildes (solo letras, números, punto, guion y guion bajo).`, 400);
    if (f !== mains[0] && !RESOURCE_EXT.test(f.name)) throw new DbError(`"${f.name}" no es un recurso de glTF admitido (.bin, .png, .jpg, .webp, .ktx2).`, 400);
  }
  if (mains[0].name.toLowerCase().endsWith(".glb") && files.length > 1) throw new DbError("Un .glb ya incluye todo: súbelo solo.", 400);
  return { main: mains[0].name, total };
}

export async function prepareDirectUpload(files: { name: string; size: number }[]) {
  const { main } = validateModelFileList(files);
  const folder = `${Date.now().toString(36)}-${randomBytes(5).toString("hex")}`;
  const storage = supabaseAdmin().storage.from(BUCKET);
  const uploads = [];
  for (const f of files) {
    const { data, error } = await storage.createSignedUploadUrl(`${folder}/${f.name}`);
    if (error || !data) throw new DbError(`No se pudo preparar la subida: ${error?.message ?? "error de Storage"}`, 502);
    uploads.push({ name: f.name, signedUrl: data.signedUrl });
  }
  return { folder, main, uploads };
}

async function removeFolder(folder: string) {
  const storage = supabaseAdmin().storage.from(BUCKET);
  const { data } = await storage.list(folder);
  if (data?.length) await storage.remove(data.map((f) => `${folder}/${f.name}`));
}

/** Descarga lo subido, lo valida y devuelve la URL pública (o borra la carpeta si no es válido). */
export async function completeDirectUpload(folder: string, main: string): Promise<{ url: string; sizeBytes: number; report: GltfInspection }> {
  if (!/^[a-z0-9-]+$/.test(folder) || !SAFE_NAME.test(main)) throw new DbError("Subida no válida.", 400);
  const storage = supabaseAdmin().storage.from(BUCKET);
  const { data: listed, error } = await storage.list(folder);
  if (error) throw new DbError(`No se pudo leer la subida: ${error.message}`, 502);
  if (!listed?.some((f) => f.name === main)) throw new DbError("No se encontró el archivo subido. Vuelve a intentarlo.", 404);
  const tmp = path.join(os.tmpdir(), `sm-direct-${randomBytes(6).toString("hex")}`);
  try {
    await fs.mkdir(tmp, { recursive: true });
    let size = 0;
    for (const f of listed) {
      if (!SAFE_NAME.test(f.name)) continue;
      const { data, error: dlError } = await storage.download(`${folder}/${f.name}`);
      if (dlError || !data) throw new DbError(`No se pudo descargar ${f.name} para validarlo.`, 502);
      const buf = Buffer.from(await data.arrayBuffer());
      size += buf.length;
      await fs.writeFile(path.join(tmp, f.name), buf);
    }
    if (size > MAX_MODEL_BYTES) {
      await removeFolder(folder);
      throw new DbError("El modelo supera 60 MB.", 413);
    }
    const report = inspectGltf(path.join(tmp, main));
    if (!report.ok) {
      await removeFolder(folder);
      return { url: "", sizeBytes: size, report };
    }
    return { url: storage.getPublicUrl(`${folder}/${main}`).data.publicUrl, sizeBytes: size, report };
  } finally {
    await fs.rm(tmp, { recursive: true, force: true }).catch(() => undefined);
  }
}
