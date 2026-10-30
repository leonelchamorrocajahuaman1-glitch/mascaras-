"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function ProductsTabs() {
  const pathname = usePathname();
  const tabs = [
    { href: "/admin/productos", label: "Productos" },
    { href: "/admin/productos/categorias", label: "Categorías" },
  ];
  return (
    <nav aria-label="Secciones de productos" className="mb-6 flex gap-1 border-b border-bone/10">
      {tabs.map((t) => (
        <Link
          key={t.href}
          href={t.href}
          aria-current={pathname === t.href ? "page" : undefined}
          className={`-mb-px border-b-2 px-4 py-2.5 text-sm transition ${pathname === t.href ? "border-blood text-bone" : "border-transparent text-steel hover:text-bone"}`}
        >
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
