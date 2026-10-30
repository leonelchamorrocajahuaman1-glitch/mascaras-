import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/server";
import { categoryInputSchema } from "@/lib/validation";
import { apiError, parseBody, refreshStore } from "@/lib/api";

export async function GET(req: Request) {
  const { error } = await requireAdmin(req, "products:view");
  if (error) return error;
  return NextResponse.json({ categories: await db().listCategories({ includeInactive: true }) });
}

export async function POST(req: Request) {
  const { error } = await requireAdmin(req, "categories:write");
  if (error) return error;
  const body = await parseBody(req, categoryInputSchema);
  if (body.error) return body.error;
  try {
    const category = await db().createCategory(body.data);
    refreshStore();
    return NextResponse.json({ category }, { status: 201 });
  } catch (err) {
    return apiError(err);
  }
}
