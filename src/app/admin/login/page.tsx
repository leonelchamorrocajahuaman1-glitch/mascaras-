import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/auth/server";
import { LoginForm } from "@/components/admin/LoginForm";
import { LogoMark } from "@/components/experience/Logo";

export const metadata = { title: "Acceso" };
export const dynamic = "force-dynamic";

export default async function LoginPage() {
  if (await getAdminSession().catch(() => null)) redirect("/admin");
  const configured = Boolean(process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD_HASH && process.env.SESSION_SECRET);
  return (
    <div className="flex min-h-screen items-center justify-center px-4" style={{ background: "radial-gradient(50% 50% at 50% 40%, rgba(225,18,31,0.15), transparent 70%)" }}>
      <div className="w-full max-w-sm space-y-8">
        <div className="space-y-4 text-center">
          <LogoMark className="mx-auto h-12 w-12 text-blood" />
          <h1 className="font-display text-4xl font-black uppercase">Panel de control</h1>
          <p className="text-sm text-steel">Acceso restringido al administrador de SPIDER MASKS.</p>
        </div>
        {!configured && (
          <p className="rounded-xl border border-blood/50 bg-blood/10 p-4 text-sm leading-relaxed">
            El administrador aún no está configurado. Ejecuta <code className="font-mono text-blood">npm run setup</code> en la carpeta del proyecto y reinicia el servidor.
          </p>
        )}
        <Suspense>
          <LoginForm />
        </Suspense>
        <p className="text-center"><a href="/" className="font-mono text-[10px] uppercase tracking-[0.25em] text-steel hover:text-bone">← Volver a la tienda</a></p>
      </div>
    </div>
  );
}
