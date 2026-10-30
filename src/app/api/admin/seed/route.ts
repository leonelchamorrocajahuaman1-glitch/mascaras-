import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/server";
import { seedProducts } from "@/lib/seed";

/** Importa el catálogo de demostración (solo crea los productos cuyo slug no existe). */
export async function POST(req: Request) {
  const { error } = await requireAdmin(req);
  if (error) return error;
  const repo = db();
  const existing = new Set((await repo.listProducts({ includeInactive: true })).map((p) => p.slug));
  let created = 0;
  for (const p of seedProducts()) {
    if (existing.has(p.slug)) continue;
    const { id: _id, createdAt: _c, updatedAt: _u, ...input } = p;
    await repo.createProduct({ ...input, variants: input.variants.map(({ id: _v, ...v }) => v) });
    created += 1;
  }
  revalidatePath("/", "layout");
  return NextResponse.json({ created });
}
