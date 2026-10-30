"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Boxes, LayoutDashboard, LogOut, Menu, Package, Receipt, Settings, Store, Users, Warehouse, X, Box } from "lucide-react";
import { can, type Permission } from "@/lib/auth/permissions";
import { ADMIN_ROLE_LABEL, type AdminRole } from "@/lib/types";
import { LogoMark } from "../experience/Logo";
import { FeedbackProvider } from "./feedback";

const NAV: { href: string; label: string; icon: typeof Package; perm: Permission; exact?: boolean }[] = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, perm: "dashboard:view", exact: true },
  { href: "/admin/productos", label: "Productos", icon: Package, perm: "products:view" },
  { href: "/admin/modelos-3d", label: "Modelos 3D", icon: Box, perm: "models:view" },
  { href: "/admin/pedidos", label: "Pedidos", icon: Receipt, perm: "orders:view" },
  { href: "/admin/clientes", label: "Clientes", icon: Users, perm: "customers:view" },
  { href: "/admin/inventario", label: "Inventario", icon: Warehouse, perm: "inventory:view" },
  { href: "/admin/configuracion", label: "Configuración", icon: Settings, perm: "dashboard:view" },
];

export interface ShellSession {
  email: string;
  name: string;
  role: AdminRole;
}

export function AdminShell({ session, dbKind, alerts, children }: { session: ShellSession; dbKind: string; alerts: { pendingOrders: number; lowStock: number }; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [pathname]);

  const logout = async () => {
    await fetch("/api/admin/logout", { method: "POST" });
    router.replace("/admin/login");
    router.refresh();
  };

  const badge = (href: string) =>
    href === "/admin/pedidos" && alerts.pendingOrders ? alerts.pendingOrders : href === "/admin/inventario" && alerts.lowStock ? alerts.lowStock : 0;

  const nav = (
    <nav aria-label="Panel de administración" className="flex flex-col gap-1">
      {NAV.filter((n) => can(session.role, n.perm)).map(({ href, label, icon: Icon, exact }) => {
        const active = exact ? pathname === href : pathname.startsWith(href);
        const b = badge(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`group relative flex items-center gap-3 overflow-hidden rounded-xl px-4 py-3 text-sm transition ${
              active ? "bg-blood/15 text-white" : "text-bone/65 hover:bg-bone/[0.04] hover:text-bone"
            }`}
          >
            <span className={`absolute inset-y-2 left-0 w-[3px] rounded-r bg-blood transition-transform ${active ? "scale-y-100" : "scale-y-0"}`} />
            <Icon size={17} className={active ? "text-blood" : ""} />
            <span className="flex-1">{label}</span>
            {b > 0 && <span className="rounded-full bg-blood px-2 py-0.5 text-[10px] font-semibold text-white tabular-nums">{b}</span>}
          </Link>
        );
      })}
      <a href="/" target="_blank" rel="noreferrer" className="mt-2 flex items-center gap-3 rounded-xl px-4 py-3 text-sm text-bone/65 hover:bg-bone/[0.04] hover:text-bone">
        <Store size={17} /> Ver tienda ↗
      </a>
    </nav>
  );

  const footer = (
    <div className="space-y-3 border-t border-bone/10 pt-4">
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-blood/20 font-display text-lg font-black uppercase text-blood">
          {(session.name || session.email).slice(0, 1)}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm">{session.name || session.email}</p>
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-steel">{ADMIN_ROLE_LABEL[session.role]}</p>
        </div>
      </div>
      <p className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-steel">
        <Boxes size={12} /> BD: {dbKind === "supabase" ? "Supabase" : "Local (JSON)"}
      </p>
      <button type="button" onClick={logout} className="flex w-full items-center gap-2 rounded-xl border border-bone/10 px-4 py-2.5 text-sm text-bone/70 transition hover:border-blood hover:text-blood">
        <LogOut size={15} /> Cerrar sesión
      </button>
    </div>
  );

  return (
    <FeedbackProvider>
      <div className="admin-bg min-h-screen lg:flex">
        {/* Barra lateral (escritorio) */}
        <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col gap-8 border-r border-bone/10 bg-black/40 p-5 backdrop-blur-xl lg:flex">
          <Link href="/admin" className="flex items-center gap-3">
            <LogoMark className="h-7 w-7 text-blood" />
            <span className="leading-none">
              <span className="block font-display text-xl font-extrabold uppercase tracking-wider">Spider Masks</span>
              <span className="font-mono text-[9px] uppercase tracking-[0.35em] text-steel">Control center</span>
            </span>
          </Link>
          <div className="flex-1 overflow-y-auto">{nav}</div>
          {footer}
        </aside>

        {/* Barra superior y menú deslizante (tablet/móvil) */}
        <header className="sticky top-0 z-40 flex items-center justify-between border-b border-bone/10 bg-black/70 px-4 py-3 backdrop-blur-xl lg:hidden">
          <Link href="/admin" className="flex items-center gap-2">
            <LogoMark className="h-6 w-6 text-blood" />
            <span className="font-display text-lg font-extrabold uppercase tracking-wider">Admin</span>
          </Link>
          <button type="button" onClick={() => setOpen(true)} aria-label="Abrir menú" aria-expanded={open} className="rounded-full border border-bone/15 p-2">
            <Menu size={18} />
          </button>
        </header>
        {open && (
          <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menú del panel">
            <div className="absolute inset-0 bg-black/70" onClick={() => setOpen(false)} />
            <div className="absolute inset-y-0 left-0 flex w-72 flex-col gap-6 border-r border-bone/10 bg-[#09090b] p-5 animate-[adminSlide_.3s_ease-out]">
              <div className="flex items-center justify-between">
                <span className="font-display text-xl font-extrabold uppercase tracking-wider">Menú</span>
                <button type="button" onClick={() => setOpen(false)} aria-label="Cerrar menú" className="rounded-full border border-bone/15 p-2">
                  <X size={16} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto">{nav}</div>
              {footer}
            </div>
          </div>
        )}

        <main id="admin-main" className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-10 lg:py-10">
          <div className="mx-auto max-w-[1400px] animate-[adminIn_.4s_ease-out]">{children}</div>
        </main>
      </div>
    </FeedbackProvider>
  );
}
