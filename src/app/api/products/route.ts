import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/** Catálogo público: solo productos activos. Útil para sincronizar precios/stock del carrito. */
export async function GET(req: Request) {
  const ids = new URL(req.url).searchParams.get("ids")?.split(",").filter(Boolean);
  let products = await db().listProducts();
  if (ids?.length) products = products.filter((p) => ids.includes(p.id));
  return NextResponse.json({ products });
}
