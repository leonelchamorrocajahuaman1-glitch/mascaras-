import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { actorLabel, requireAdmin } from "@/lib/auth/server";
import { seedProducts } from "@/lib/seed";
import { seedCategories } from "@/lib/defaults";

/** Importa el catálogo de demostración (solo crea los productos cuyo slug no existe). */
export async function POST(req: Request) {
  const { session, error } = await requireAdmin(req, "products:write");
  if (error) return error;
  const repo = db();
  const existing = new Set((await repo.listProducts({ includeInactive: true })).map((p) => p.slug));
  // Las categorías iniciales deben existir antes que los productos que las usan.
  const cats = new Set((await repo.listCategories({ includeInactive: true })).map((c) => c.slug));
  for (const c of seedCategories()) if (!cats.has(c.slug)) await repo.createCategory({ slug: c.slug, name: c.name, description: c.description, sortOrder: c.sortOrder, active: true });
  let created = 0;
  for (const p of seedProducts()) {
    if (existing.has(p.slug)) continue;
    const { id: _id, createdAt: _c, updatedAt: _u, ...input } = p;
    await repo.createProduct({ ...input, variants: input.variants.map(({ id: _v, ...v }) => v) }, actorLabel(session));
    created += 1;
  }
  revalidatePath("/", "layout");
  return NextResponse.json({ created });
}
