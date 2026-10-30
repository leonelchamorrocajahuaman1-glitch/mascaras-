import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { createSessionToken, SESSION_COOKIE, SESSION_TTL_SECONDS, type TokenClaims } from "@/lib/auth/session";
import { DUMMY_HASH, verifyPassword } from "@/lib/auth/password";
import { clearRateLimit, rateLimit } from "@/lib/auth/rate-limit";
import { clientIp } from "@/lib/auth/server";
import { db } from "@/lib/db";
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

  const key = `login:${await clientIp(req)}`;
  const limit = rateLimit(key, 5, 15 * 60 * 1000);
  if (!limit.ok) {
    return NextResponse.json(
      { error: `Demasiados intentos. Espera ${Math.ceil(limit.retryAfter / 60)} min.` },
      { status: 429, headers: { "Retry-After": String(limit.retryAfter) } },
    );
  }

  const ownerEmail = process.env.ADMIN_EMAIL;
  const ownerHash = process.env.ADMIN_PASSWORD_HASH;
  if (!ownerEmail || !ownerHash || !process.env.SESSION_SECRET) {
    return NextResponse.json(
      {
        error: process.env.VERCEL
          ? "El administrador no está configurado en Vercel: añade ADMIN_EMAIL, ADMIN_PASSWORD_HASH y SESSION_SECRET en Settings → Environment Variables y vuelve a desplegar."
          : "El administrador no está configurado. Ejecuta `npm run setup` y reinicia el servidor.",
      },
      { status: 503 },
    );
  }

  const parsed = loginSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Credenciales no válidas." }, { status: 400 });
  const { email, password } = parsed.data;

  let claims: TokenClaims | null = null;
  let userId: string | null = null;
  if (sameText(email, ownerEmail)) {
    if (await verifyPassword(password, ownerHash)) claims = { sub: "owner", email: ownerEmail.toLowerCase(), role: "owner", ver: 0 };
  } else {
    const user = await db().getAdminUserByEmail(email);
    // Siempre se calcula un hash para que el tiempo de respuesta no revele si el email existe.
    const ok = await verifyPassword(password, user?.passwordHash ?? DUMMY_HASH);
    if (user && ok) {
      if (!user.active) return NextResponse.json({ error: "Esta cuenta del panel está desactivada." }, { status: 403 });
      claims = { sub: user.id, email: user.email, role: user.role, ver: user.sessionVersion };
      userId = user.id;
    }
  }
  if (!claims) return NextResponse.json({ error: "Credenciales no válidas." }, { status: 401 });

  clearRateLimit(key);
  if (userId) await db().updateAdminUser(userId, { lastLoginAt: new Date().toISOString() });
  const res = NextResponse.json({ ok: true, role: claims.role });
  res.cookies.set(SESSION_COOKIE, await createSessionToken(claims), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production" && !host.startsWith("localhost"),
    sameSite: "strict",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
  return res;
}
