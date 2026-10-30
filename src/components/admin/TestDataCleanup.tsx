"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { adminFetch, useFeedback } from "./feedback";
import { btnGhost } from "./ui";

export function TestDataCleanup({ count }: { count: number }) {
  const router = useRouter();
  const { toast, confirm } = useFeedback();
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      disabled={busy || count === 0}
      className={btnGhost}
      onClick={async () => {
        if (!(await confirm({ title: "Borrar pedidos de prueba", body: `Se eliminarán ${count} pedido(s) marcados como prueba y se repondrá su stock.`, danger: true, confirmLabel: "Borrar" }))) return;
        setBusy(true);
        try {
          const r = await adminFetch<{ removed: number }>("/api/admin/orders/test-data", { method: "DELETE" });
          toast(`${r.removed} pedido(s) de prueba eliminados.`);
          router.refresh();
        } catch (e) {
          toast((e as Error).message, "error");
        } finally {
          setBusy(false);
        }
      }}
    >
      Borrar pedidos de prueba ({count})
    </button>
  );
}
