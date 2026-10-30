"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, Info, X } from "lucide-react";

type Tone = "success" | "error" | "info";
interface Toast {
  id: number;
  tone: Tone;
  text: string;
}
interface ConfirmOptions {
  title: string;
  body?: string;
  confirmLabel?: string;
  danger?: boolean;
}

const Ctx = createContext<{ toast: (text: string, tone?: Tone) => void; confirm: (o: ConfirmOptions) => Promise<boolean> } | null>(null);

/** Notificaciones y diálogo de confirmación del panel (accesibles con teclado). */
export function FeedbackProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [dialog, setDialog] = useState<(ConfirmOptions & { resolve: (v: boolean) => void }) | null>(null);
  const confirmBtn = useRef<HTMLButtonElement>(null);

  const toast = useCallback((text: string, tone: Tone = "success") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, tone, text }]);
    window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), tone === "error" ? 7000 : 4000);
  }, []);

  const confirm = useCallback((o: ConfirmOptions) => new Promise<boolean>((resolve) => setDialog({ ...o, resolve })), []);

  useEffect(() => {
    if (!dialog) return;
    confirmBtn.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        dialog.resolve(false);
        setDialog(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dialog]);

  const close = (v: boolean) => {
    dialog?.resolve(v);
    setDialog(null);
  };

  return (
    <Ctx.Provider value={{ toast, confirm }}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed bottom-4 right-4 z-[200] flex w-[min(92vw,380px)] flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            role={t.tone === "error" ? "alert" : "status"}
            className={`pointer-events-auto flex items-start gap-3 rounded-xl border px-4 py-3 text-sm shadow-2xl backdrop-blur-md animate-[adminIn_.35s_ease-out] ${
              t.tone === "error" ? "border-blood/60 bg-[#2a0a0d]/90" : t.tone === "info" ? "border-bone/15 bg-coal/90" : "border-emerald-500/40 bg-[#0b1f17]/90"
            }`}
          >
            {t.tone === "error" ? <AlertTriangle size={16} className="mt-0.5 shrink-0 text-blood" /> : t.tone === "info" ? <Info size={16} className="mt-0.5 shrink-0" /> : <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-400" />}
            <p className="flex-1">{t.text}</p>
            <button type="button" onClick={() => setToasts((x) => x.filter((y) => y.id !== t.id))} aria-label="Cerrar aviso" className="text-steel hover:text-bone">
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
      {dialog && (
        <div className="fixed inset-0 z-[210] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" onClick={() => close(false)}>
          <div role="alertdialog" aria-modal="true" aria-labelledby="confirm-title" className="w-full max-w-md rounded-2xl border border-bone/15 bg-[#0d0d10] p-6 shadow-2xl animate-[adminIn_.25s_ease-out]" onClick={(e) => e.stopPropagation()}>
            <p id="confirm-title" className="font-display text-2xl font-black uppercase">{dialog.title}</p>
            {dialog.body && <p className="mt-3 text-sm leading-relaxed text-bone/70">{dialog.body}</p>}
            <div className="mt-6 flex justify-end gap-2">
              <button type="button" onClick={() => close(false)} className="rounded-full border border-bone/15 px-5 py-2.5 text-sm hover:border-bone/40">
                Cancelar
              </button>
              <button
                ref={confirmBtn}
                type="button"
                onClick={() => close(true)}
                className={`rounded-full px-5 py-2.5 text-sm text-white ${dialog.danger ? "bg-blood hover:bg-ember" : "bg-graphite hover:bg-bone/20"}`}
              >
                {dialog.confirmLabel ?? "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </Ctx.Provider>
  );
}

export function useFeedback() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useFeedback debe usarse dentro de FeedbackProvider");
  return ctx;
}

/** fetch JSON con mensajes de error legibles. */
export async function adminFetch<T = unknown>(url: string, init?: RequestInit & { json?: unknown }): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: init?.json !== undefined ? { "Content-Type": "application/json", ...(init?.headers ?? {}) } : init?.headers,
    body: init?.json !== undefined ? JSON.stringify(init.json) : init?.body,
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401) {
    window.location.href = "/admin/login";
    throw new Error("Tu sesión ha caducado.");
  }
  if (!res.ok) throw new Error((data as { error?: string }).error ?? `Error ${res.status}`);
  return data as T;
}
