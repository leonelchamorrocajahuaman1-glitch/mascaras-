"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, LogOut, Package, Receipt, Store } from "lucide-react";
import { LogoMark } from "../experience/Logo";

const NAV = [
  { href: "/admin", label: "Resumen", icon: LayoutDashboard, exact: true },
  { href: "/admin/products", label: "Productos", icon: Package },
  { href: "/admin/orders", label: "Pedidos", icon: Receipt },
];

export function AdminNav({ email, dbKind }: { email: string; dbKind: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const logout = async () => {
    await fetch("/api/admin/logout", { method: "POST" });
    router.replace("/admin/login");
    router.refresh();
  };
  return (
    <aside className="flex flex-col gap-6 border-b border-bone/10 p-5 lg:sticky lg:top-0 lg:h-screen lg:w-64 lg:border-b-0 lg:border-r">
      <Link href="/admin" className="flex items-center gap-3">
        <LogoMark className="h-7 w-7 text-blood" />
        <span className="font-display text-xl font-extrabold uppercase tracking-wider">Admin</span>
      </Link>
      <nav aria-label="Administración" className="flex gap-1 overflow-x-auto lg:flex-col">
        {NAV.map(({ href, label, icon: Icon, exact }) => {
          const active = exact ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`flex shrink-0 items-center gap-3 rounded-xl px-4 py-3 text-sm transition ${active ? "bg-blood text-white" : "text-bone/70 hover:bg-bone/5 hover:text-bone"}`}
            >
              <Icon size={16} /> {label}
            </Link>
          );
        })}
        <a href="/" target="_blank" rel="noreferrer" className="flex shrink-0 items-center gap-3 rounded-xl px-4 py-3 text-sm text-bone/70 hover:bg-bone/5 hover:text-bone">
          <Store size={16} /> Ver tienda
        </a>
      </nav>
      <div className="mt-auto hidden space-y-3 lg:block">
        <p className="rounded-xl border border-bone/10 p-3 font-mono text-[10px] uppercase tracking-[0.2em] text-steel">
          Base de datos: <span className="text-bone">{dbKind === "supabase" ? "Supabase" : "Local (JSON)"}</span>
        </p>
        <p className="truncate text-xs text-steel">{email}</p>
        <button type="button" onClick={logout} className="flex items-center gap-2 text-sm text-bone/70 hover:text-blood">
          <LogOut size={15} /> Cerrar sesión
        </button>
      </div>
      <button type="button" onClick={logout} className="flex items-center gap-2 text-sm text-bone/70 hover:text-blood lg:hidden">
        <LogOut size={15} /> Cerrar sesión
      </button>
    </aside>
  );
}
