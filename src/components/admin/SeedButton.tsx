"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function SeedButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          const res = await fetch("/api/admin/seed", { method: "POST" });
          const data = await res.json().catch(() => ({}));
          setMsg(res.ok ? `${data.created} productos importados.` : data.error ?? "Error");
          setBusy(false);
          router.refresh();
        }}
        className="rounded-full border border-bone/20 px-5 py-2.5 text-sm hover:border-blood disabled:opacity-50"
      >
        {busy ? "Importando…" : "Importar catálogo de demostración"}
      </button>
      {msg && <span className="text-sm text-steel">{msg}</span>}
    </div>
  );
}
