import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/server";

// Vercel limita el cuerpo de una petición a ~4,5 MB: en producción las fotos deben pesar menos de 4 MB.
const MAX_BYTES = (process.env.VERCEL ? 4 : 5) * 1024 * 1024;

/** Detecta el tipo real por la firma del archivo (no confía en el nombre ni en el MIME enviado). */
function sniff(buf: Buffer): { ext: string; mime: string } | null {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return { ext: "jpg", mime: "image/jpeg" };
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return { ext: "png", mime: "image/png" };
  if (buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP") return { ext: "webp", mime: "image/webp" };
  if (buf.toString("ascii", 4, 12) === "ftypavif") return { ext: "avif", mime: "image/avif" };
  return null;
}

export async function POST(req: Request) {
  const { error } = await requireAdmin(req, "products:write");
  if (error) return error;

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "No se recibió ningún archivo." }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: `La imagen supera ${MAX_BYTES / 1048576} MB. Comprímela (por ejemplo a WebP) y vuelve a subirla.` }, { status: 413 });

  const buf = Buffer.from(await file.arrayBuffer());
  const type = sniff(buf);
  if (!type) return NextResponse.json({ error: "Formato no permitido. Usa JPG, PNG, WebP o AVIF." }, { status: 415 });

  const url = await db().saveImage(buf, type.ext, type.mime);
  return NextResponse.json({ url }, { status: 201 });
}
