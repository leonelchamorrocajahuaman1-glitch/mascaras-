import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/server";
import { hashPassword } from "@/lib/auth/password";
import { adminUserCreateSchema } from "@/lib/validation";
import { apiError, parseBody } from "@/lib/api";
import { publicUser } from "@/lib/admin-users";

export async function GET(req: Request) {
  const { error } = await requireAdmin(req, "users:manage");
  if (error) return error;
  return NextResponse.json({ users: (await db().listAdminUsers()).map(publicUser) });
}

/** Solo el propietario crea usuarios del panel: no existe registro público de administradores. */
export async function POST(req: Request) {
  const { error } = await requireAdmin(req, "users:manage");
  if (error) return error;
  const body = await parseBody(req, adminUserCreateSchema);
  if (body.error) return body.error;
  try {
    const { password, ...rest } = body.data;
    const user = await db().createAdminUser({ ...rest, passwordHash: await hashPassword(password) });
    return NextResponse.json({ user: publicUser(user) }, { status: 201 });
  } catch (err) {
    return apiError(err);
  }
}
