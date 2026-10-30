import { Suspense } from "react";
import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { getAdminSession } from "@/lib/auth/server";
import { LoginForm } from "@/components/admin/LoginForm";
import { LogoMark } from "@/components/experience/Logo";

export const metadata = { title: "Acceso" };
export const dynamic = "force-dynamic";

export default async function LoginPage() {
  if (await getAdminSession().catch(() => null)) redirect("/admin");
  const configured = Boolean(process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD_HASH && process.env.SESSION_SECRET);
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#050506] px-4 py-10">
      {/* Fondo: retícula técnica, halo rojo y línea de escaneo */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 opacity-[0.08]" style={{ backgroundImage: "linear-gradient(rgba(243,243,241,1) 1px, transparent 1px), linear-gradient(90deg, rgba(243,243,241,1) 1px, transparent 1px)", backgroundSize: "56px 56px", maskImage: "radial-gradient(circle at 50% 45%, black, transparent 72%)" }} />
        <div className="absolute left-1/2 top-[42%] h-[80vmin] w-[80vmin] -translate-x-1/2 -translate-y-1/2 rounded-full" style={{ background: "radial-gradient(closest-side, rgba(225,18,31,0.28), transparent 70%)" }} />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blood to-transparent opacity-70 shadow-[0_0_18px_3px_rgba(225,18,31,0.6)] motion-safe:animate-[adminScan_6s_linear_infinite]" />
        <svg viewBox="0 0 400 400" className="absolute left-1/2 top-[42%] h-[92vmin] w-[92vmin] -translate-x-1/2 -translate-y-1/2 opacity-30">
          <circle cx="200" cy="200" r="196" fill="none" stroke="rgba(243,243,241,0.25)" strokeWidth="0.5" />
          <circle cx="200" cy="200" r="160" fill="none" stroke="rgba(225,18,31,0.6)" strokeWidth="0.6" strokeDasharray="1 7" className="origin-center motion-safe:animate-[spin_80s_linear_infinite]" />
          {Array.from({ length: 48 }).map((_, i) => (
            <line key={i} x1="200" y1="6" x2="200" y2={i % 4 ? 11 : 18} stroke="rgba(243,243,241,0.4)" strokeWidth="0.6" transform={`rotate(${i * 7.5} 200 200)`} />
          ))}
        </svg>
      </div>

      <div className="relative w-full max-w-[420px] animate-[adminIn_.6s_ease-out]">
        <div className="mb-8 flex flex-col items-center gap-4 text-center">
          <LogoMark className="h-12 w-12 text-blood drop-shadow-[0_0_14px_rgba(225,18,31,0.7)]" />
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.45em] text-blood">Restricted access</p>
            <h1 className="mt-2 font-display text-5xl font-black uppercase leading-none">Control center</h1>
            <p className="mt-3 text-sm text-steel">Panel privado de administración de SPIDER MASKS.</p>
          </div>
        </div>
        <div className="relative rounded-3xl border border-bone/10 bg-white/[0.03] p-7 shadow-[0_30px_80px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.05)] backdrop-blur-xl">
          <div className="hud-corners pointer-events-none absolute inset-3 opacity-60" style={{ ["--c" as string]: "rgba(225,18,31,0.7)" }} />
          {!configured && (
            <p className="mb-5 rounded-xl border border-blood/50 bg-blood/10 p-4 text-sm leading-relaxed">
              El administrador aún no está configurado. Ejecuta <code className="font-mono text-blood">npm run setup</code> en la carpeta del proyecto y reinicia el servidor.
            </p>
          )}
          <Suspense>
            <LoginForm />
          </Suspense>
        </div>
        <p className="mt-6 flex items-center justify-center gap-2 text-center text-xs text-steel">
          <ShieldCheck size={13} className="text-blood" /> Sesión cifrada · intentos limitados · sin registro público
        </p>
        <p className="mt-3 text-center">
          <a href="/" className="font-mono text-[10px] uppercase tracking-[0.25em] text-steel hover:text-bone">← Volver a la tienda</a>
        </p>
      </div>
    </div>
  );
}
