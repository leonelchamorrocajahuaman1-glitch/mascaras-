import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { db, DbError } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/server";
import { firstIssue, productInputSchema } from "@/lib/validation";

export async function GET(req: Request) {
  const { error } = await requireAdmin(req);
  if (error) return error;
  return NextResponse.json({ products: await db().listProducts({ includeInactive: true }) });
}

export async function POST(req: Request) {
  const { error } = await requireAdmin(req);
  if (error) return error;
  const parsed = productInputSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: firstIssue(parsed.error) }, { status: 400 });
  try {
    const product = await db().createProduct(parsed.data);
    revalidatePath("/", "layout");
    return NextResponse.json({ product }, { status: 201 });
  } catch (err) {
    if (err instanceof DbError) return NextResponse.json({ error: err.message }, { status: err.status });
    throw err;
  }
}
