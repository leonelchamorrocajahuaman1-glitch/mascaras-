import { promises as fs } from "node:fs";
import path from "node:path";
import { MODEL_UPLOAD_DIR } from "@/lib/db/local";

const TYPES: Record<string, string> = {
  glb: "model/gltf-binary",
  gltf: "model/gltf+json",
  bin: "application/octet-stream",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  ktx2: "image/ktx2",
};

/** Sirve los modelos subidos desde el panel (base de datos local). Nombres validados: sin rutas relativas. */
export async function GET(_req: Request, ctx: { params: Promise<{ folder: string; file: string }> }) {
  const { folder, file } = await ctx.params;
  const name = decodeURIComponent(file);
  if (!/^[a-z0-9-]+$/.test(folder) || !/^[A-Za-z0-9][A-Za-z0-9._-]{0,120}$/.test(name)) return new Response("Not found", { status: 404 });
  const ext = name.split(".").pop()!.toLowerCase();
  if (!TYPES[ext]) return new Response("Not found", { status: 404 });
  try {
    const data = await fs.readFile(path.join(MODEL_UPLOAD_DIR, folder, name));
    return new Response(new Uint8Array(data), {
      headers: { "Content-Type": TYPES[ext], "Cache-Control": "public, max-age=31536000, immutable", "X-Content-Type-Options": "nosniff" },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
