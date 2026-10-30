import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-start justify-center px-[var(--gutter)]">
      <p className="font-mono text-[11px] uppercase tracking-[0.35em] text-blood">Error 404</p>
      <h1 className="mt-4 font-display text-[clamp(96px,18vw,320px)] font-black uppercase leading-[0.8]">
        Lost <span className="text-outline">in the web</span>
      </h1>
      <Link href="/" className="mt-10 rounded-full bg-blood px-8 py-4 font-mono text-[11px] uppercase tracking-[0.3em] text-white">
        Volver al inicio
      </Link>
    </div>
  );
}
