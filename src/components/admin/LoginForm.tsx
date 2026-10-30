"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, Loader2, Lock } from "lucide-react";

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [show, setShow] = useState(false);

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: form.get("email"), password: form.get("password") }),
    }).catch(() => null);
    if (!res) {
      setError("No se pudo conectar con el servidor.");
      setLoading(false);
      return;
    }
    if (!res.ok) {
      setError((await res.json().catch(() => ({}))).error ?? "Error al iniciar sesión.");
      setLoading(false);
      return;
    }
    const next = params.get("next");
    router.replace(next && next.startsWith("/admin") ? next : "/admin");
    router.refresh();
  };

  return (
    <form onSubmit={submit} className="space-y-5">
      <label className="block space-y-2">
        <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-steel">Email</span>
        <input name="email" type="email" required autoComplete="username" autoFocus className="h-12 w-full rounded-xl border border-bone/15 bg-black/50 px-4 text-sm focus:border-blood focus:outline-none focus:ring-2 focus:ring-blood/20" />
      </label>
      <label className="block space-y-2">
        <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-steel">Contraseña</span>
        <span className="relative block">
          <input name="password" type={show ? "text" : "password"} required autoComplete="current-password" className="h-12 w-full rounded-xl border border-bone/15 bg-black/50 px-4 pr-11 text-sm focus:border-blood focus:outline-none focus:ring-2 focus:ring-blood/20" />
          <button type="button" onClick={() => setShow((v) => !v)} aria-label={show ? "Ocultar contraseña" : "Mostrar contraseña"} className="absolute right-3 top-1/2 -translate-y-1/2 text-steel hover:text-bone">
            {show ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </span>
      </label>
      {error && (
        <p role="alert" className="rounded-xl border border-blood/50 bg-blood/10 px-4 py-3 text-sm">
          {error}
        </p>
      )}
      <button type="submit" disabled={loading} className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-blood font-mono text-[11px] uppercase tracking-[0.25em] text-white hover:bg-ember disabled:opacity-60">
        {loading ? <Loader2 size={15} className="animate-spin" /> : <Lock size={14} />} Entrar
      </button>
    </form>
  );
}
