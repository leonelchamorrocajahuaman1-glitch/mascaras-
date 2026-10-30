import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { createSessionToken, SESSION_COOKIE, SESSION_TTL_SECONDS } from "@/lib/auth/session";
import { verifyPassword } from "@/lib/auth/password";
import { clearRateLimit, rateLimit } from "@/lib/auth/rate-limit";
import { clientIp } from "@/lib/auth/server";
import { loginSchema } from "@/lib/validation";

function sameText(a: string, b: string) {
  const ba = Buffer.from(a.toLowerCase());
  const bb = Buffer.from(b.toLowerCase());
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

export async function POST(req: Request) {
  const origin = req.headers.get("origin");
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  if (!origin || !host || new URL(origin).host !== host) {
    return NextResponse.json({ error: "Origen no permitido." }, { status: 403 });
  }

  const key = `login:${clientIp(req)}`;
  const limit = rateLimit(key, 5, 15 * 60 * 1000);
  if (!limit.ok) {
    return NextResponse.json(
      { error: `Demasiados intentos. Espera ${Math.ceil(limit.retryAfter / 60)} min.` },
      { status: 429, headers: { "Retry-After": String(limit.retryAfter) } },
    );
  }

  const adminEmail = process.env.ADMIN_EMAIL;
  const adminHash = process.env.ADMIN_PASSWORD_HASH;
  if (!adminEmail || !adminHash || !process.env.SESSION_SECRET) {
    return NextResponse.json(
      { error: "El administrador no está configurado. Ejecuta `npm run setup` y reinicia el servidor." },
      { status: 503 },
    );
  }

  const parsed = loginSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Credenciales no válidas." }, { status: 400 });

  const { email, password } = parsed.data;
  const passwordOk = await verifyPassword(password, adminHash);
  if (!passwordOk || !sameText(email, adminEmail)) {
    return NextResponse.json({ error: "Credenciales no válidas." }, { status: 401 });
  }

  clearRateLimit(key);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, await createSessionToken(adminEmail), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production" && !host.startsWith("localhost"),
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
  return res;
}
