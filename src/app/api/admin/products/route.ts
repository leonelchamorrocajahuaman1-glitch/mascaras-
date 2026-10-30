import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { actorLabel, requireAdmin } from "@/lib/auth/server";
import { productInputSchema } from "@/lib/validation";
import { apiError, parseBody, refreshStore } from "@/lib/api";

export async function GET(req: Request) {
  const { error } = await requireAdmin(req, "products:view");
  if (error) return error;
  return NextResponse.json({ products: await db().listProducts({ includeInactive: true }) });
}

export async function POST(req: Request) {
  const { session, error } = await requireAdmin(req, "products:write");
  if (error) return error;
  const body = await parseBody(req, productInputSchema);
  if (body.error) return body.error;
  try {
    const product = await db().createProduct(body.data, actorLabel(session));
    refreshStore();
    return NextResponse.json({ product }, { status: 201 });
  } catch (err) {
    return apiError(err);
  }
}
