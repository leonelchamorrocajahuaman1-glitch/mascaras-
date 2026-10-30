"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, Plus, Trash2, UserCheck, UserX } from "lucide-react";
import { ROLE_DESCRIPTION } from "@/lib/auth/permissions";
import { formatDate } from "@/lib/format";
import { ADMIN_ROLE_LABEL, type PublicAdminUser } from "@/lib/types";
import { adminFetch, useFeedback } from "./feedback";
import { Card, btnGhost, btnPrimary, inputCls, labelCls } from "./ui";

export function UsersManager({ users, ownerEmail }: { users: PublicAdminUser[]; ownerEmail: string }) {
  const router = useRouter();
  const { toast, confirm } = useFeedback();
  const [form, setForm] = useState({ email: "", name: "", role: "staff" as "admin" | "staff", password: "" });
  const [busy, setBusy] = useState(false);

  const run = async (fn: () => Promise<unknown>, ok: string) => {
    setBusy(true);
    try {
      await fn();
      toast(ok);
      router.refresh();
      return true;
    } catch (e) {
      toast((e as Error).message, "error");
      return false;
    } finally {
      setBusy(false);
    }
  };

  const resetPassword = async (u: PublicAdminUser) => {
    const pwd = window.prompt(`Nueva contraseña para ${u.email} (mínimo 10 caracteres, letras y números):`);
    if (!pwd) return;
    run(() => adminFetch(`/api/admin/users/${u.id}`, { method: "PATCH", json: { password: pwd } }), "Contraseña cambiada. Sus sesiones abiertas se han cerrado.");
  };

  return (
    <Card className="space-y-5 p-6">
      <div>
        <h2 className="font-display text-2xl font-black uppercase">Usuarios del panel</h2>
        <p className="mt-1 text-sm text-steel">Solo el propietario puede crear accesos. No existe registro público de administradores.</p>
      </div>
      <ul className="space-y-2 text-xs text-steel">
        {(["owner", "admin", "staff"] as const).map((r) => <li key={r}><strong className="text-bone">{ADMIN_ROLE_LABEL[r]}:</strong> {ROLE_DESCRIPTION[r]}</li>)}
      </ul>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[620px] text-left text-sm">
          <thead className="font-mono text-[10px] uppercase tracking-[0.2em] text-steel">
            <tr><th className="py-2 font-normal">Usuario</th><th className="py-2 font-normal">Rol</th><th className="py-2 font-normal">Último acceso</th><th className="py-2 font-normal">Estado</th><th className="py-2 font-normal"><span className="sr-only">Acciones</span></th></tr>
          </thead>
          <tbody className="divide-y divide-bone/5">
            <tr>
              <td className="py-2.5"><p>Propietario</p><p className="text-xs text-steel">{ownerEmail}</p></td>
              <td className="py-2.5">{ADMIN_ROLE_LABEL.owner}</td>
              <td className="py-2.5 text-steel">—</td>
              <td className="py-2.5 text-xs text-emerald-300">Activo</td>
              <td className="py-2.5 text-xs text-steel">Definido en .env.local</td>
            </tr>
            {users.map((u) => (
              <tr key={u.id}>
                <td className="py-2.5"><p>{u.name}</p><p className="text-xs text-steel">{u.email}</p></td>
                <td className="py-2.5">
                  <select
                    aria-label={`Rol de ${u.email}`}
                    value={u.role}
                    disabled={busy}
                    onChange={(e) => run(() => adminFetch(`/api/admin/users/${u.id}`, { method: "PATCH", json: { role: e.target.value } }), "Rol actualizado. El usuario debe volver a iniciar sesión.")}
                    className="h-9 rounded-full border border-bone/15 bg-black/40 px-3 text-xs"
                  >
                    <option value="admin">{ADMIN_ROLE_LABEL.admin}</option>
                    <option value="staff">{ADMIN_ROLE_LABEL.staff}</option>
                  </select>
                </td>
                <td className="py-2.5 text-steel">{u.lastLoginAt ? formatDate(u.lastLoginAt) : "Nunca"}</td>
                <td className="py-2.5 text-xs">{u.active ? <span className="text-emerald-300">Activo</span> : <span className="text-blood">Desactivado</span>}</td>
                <td className="py-2.5">
                  <div className="flex justify-end gap-2">
                    <button type="button" disabled={busy} onClick={() => resetPassword(u)} className="rounded-full border border-bone/15 p-2 hover:border-bone" aria-label={`Cambiar contraseña de ${u.email}`} title="Cambiar contraseña"><KeyRound size={14} /></button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={async () => {
                        if (u.active && !(await confirm({ title: `Desactivar ${u.email}`, body: "No podrá iniciar sesión y sus sesiones abiertas se cierran de inmediato.", danger: true, confirmLabel: "Desactivar" }))) return;
                        run(() => adminFetch(`/api/admin/users/${u.id}`, { method: "PATCH", json: { active: !u.active } }), u.active ? "Usuario desactivado." : "Usuario reactivado.");
                      }}
                      className="rounded-full border border-bone/15 p-2 hover:border-blood"
                      aria-label={u.active ? `Desactivar ${u.email}` : `Reactivar ${u.email}`}
                      title={u.active ? "Desactivar" : "Reactivar"}
                    >
                      {u.active ? <UserX size={14} /> : <UserCheck size={14} />}
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={async () => (await confirm({ title: `Eliminar ${u.email}`, body: "El acceso se elimina definitivamente.", danger: true, confirmLabel: "Eliminar" })) && run(() => adminFetch(`/api/admin/users/${u.id}`, { method: "DELETE" }), "Usuario eliminado.")}
                      className="rounded-full border border-bone/15 p-2 hover:border-blood hover:text-blood"
                      aria-label={`Eliminar ${u.email}`}
                      title="Eliminar"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="grid gap-3 rounded-xl border border-bone/10 p-4 sm:grid-cols-2">
        <p className="font-display text-xl font-black uppercase sm:col-span-2">Nuevo usuario</p>
        <label className="space-y-1.5"><span className={labelCls}>Nombre</span><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputCls} /></label>
        <label className="space-y-1.5"><span className={labelCls}>Email</span><input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={inputCls} /></label>
        <label className="space-y-1.5">
          <span className={labelCls}>Rol</span>
          <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as "admin" | "staff" })} className={inputCls}>
            <option value="staff">{ADMIN_ROLE_LABEL.staff}</option>
            <option value="admin">{ADMIN_ROLE_LABEL.admin}</option>
          </select>
        </label>
        <label className="space-y-1.5"><span className={labelCls}>Contraseña inicial</span><input type="password" autoComplete="new-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="≥ 10 caracteres, letras y números" className={inputCls} /></label>
        <div className="sm:col-span-2">
          <button
            type="button"
            disabled={busy}
            className={btnPrimary}
            onClick={async () => {
              if (await run(() => adminFetch("/api/admin/users", { method: "POST", json: form }), `Usuario ${form.email} creado.`)) setForm({ email: "", name: "", role: "staff", password: "" });
            }}
          >
            <Plus size={15} /> Crear usuario
          </button>
        </div>
      </div>
    </Card>
  );
}
