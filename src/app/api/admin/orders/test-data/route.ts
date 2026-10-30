import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/server";
import { apiError, refreshStore } from "@/lib/api";

/** Borra los pedidos marcados como prueba (repone su stock). Solo el propietario. */
export async function DELETE(req: Request) {
  const { error } = await requireAdmin(req, "orders:cleanup");
  if (error) return error;
  try {
    const removed = await db().deleteTestOrders();
    refreshStore();
    return NextResponse.json({ removed });
  } catch (err) {
    return apiError(err);
  }
}
