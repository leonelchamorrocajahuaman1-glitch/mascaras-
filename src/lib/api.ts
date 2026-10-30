import "server-only";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import type { z } from "zod";
import { DbError } from "./db";
import { firstIssue } from "./validation";

/** Convierte errores conocidos en respuestas JSON; los inesperados se registran sin filtrar detalles. */
export function apiError(err: unknown) {
  if (err instanceof DbError) return NextResponse.json({ error: err.message }, { status: err.status });
  console.error(err);
  return NextResponse.json({ error: "Error interno del servidor." }, { status: 500 });
}

export async function parseBody<T extends z.ZodType>(req: Request, schema: T): Promise<{ data: z.infer<T>; error: null } | { data: null; error: NextResponse }> {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return { data: null, error: NextResponse.json({ error: firstIssue(parsed.error) }, { status: 400 }) };
  return { data: parsed.data, error: null };
}

/** Las páginas de la tienda son dinámicas; además se invalida cualquier caché para que los cambios se vean al instante. */
export function refreshStore() {
  revalidatePath("/", "layout");
}
