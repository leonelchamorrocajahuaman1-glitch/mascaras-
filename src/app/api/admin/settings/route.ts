import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/server";
import { settingsSchema } from "@/lib/validation";
import { apiError, parseBody, refreshStore } from "@/lib/api";

export async function GET(req: Request) {
  const { error } = await requireAdmin(req, "dashboard:view");
  if (error) return error;
  return NextResponse.json({ settings: await db().getSettings() });
}

export async function PUT(req: Request) {
  const { error } = await requireAdmin(req, "settings:write");
  if (error) return error;
  const body = await parseBody(req, settingsSchema);
  if (body.error) return body.error;
  try {
    const settings = await db().updateSettings(body.data);
    refreshStore();
    return NextResponse.json({ settings });
  } catch (err) {
    return apiError(err);
  }
}
