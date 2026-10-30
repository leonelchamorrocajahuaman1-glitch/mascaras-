import { TLink } from "./RouteTransition";
import { LogoMark } from "./Logo";
import { Marquee } from "./Marquee";

export function Footer() {
  return (
    <footer className="relative overflow-hidden border-t border-bone/10 bg-ink pt-16">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[60%]"
        style={{ background: "radial-gradient(50% 80% at 50% 100%, rgba(225,18,31,0.28), transparent 70%)" }}
      />
      <Marquee
        items={["Behind the mask", "Spider Masks", "Collection 01", "Crafted in the dark"]}
        className="font-display text-[clamp(40px,7vw,96px)] font-black uppercase text-outline"
        speed={50}
      />
      <div className="relative mx-auto grid gap-10 px-[var(--gutter)] py-16 md:grid-cols-4">
        <div className="md:col-span-2">
          <LogoMark className="mb-6 h-10 w-10 text-blood" />
          <p className="max-w-sm text-sm leading-relaxed text-steel">
            Una experiencia digital dedicada al universo de las máscaras arácnidas. Diseño cinematográfico, modelos 3D interactivos y
            una colección de edición limitada.
          </p>
        </div>
        <nav aria-label="Pie de página" className="font-mono text-[11px] uppercase tracking-[0.25em]">
          <p className="mb-4 text-steel">Explorar</p>
          <ul className="space-y-3">
            <li><TLink href="/" className="hover:text-blood">Home</TLink></li>
            <li><TLink href="/shop" className="hover:text-blood">Shop</TLink></li>
            <li><TLink href="/lab" className="hover:text-blood">3D Mask Lab</TLink></li>
            <li><TLink href="/cart" className="hover:text-blood">Cart</TLink></li>
          </ul>
        </nav>
        <div className="font-mono text-[11px] uppercase tracking-[0.25em]">
          <p className="mb-4 text-steel">Estado</p>
          <ul className="space-y-3 text-bone/80">
            <li className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-blood" /> Tienda demo</li>
            <li>Pagos no activos</li>
            <li><a href="/admin" className="hover:text-blood">Admin</a></li>
          </ul>
        </div>
      </div>
      <div className="relative px-[var(--gutter)]">
        <p className="select-none font-display text-[clamp(64px,17vw,300px)] font-black uppercase leading-[0.78] tracking-tight text-bone">
          Behind<span className="text-blood">.</span>the<span className="text-blood">.</span>mask
        </p>
      </div>
      <div className="relative flex flex-col gap-2 border-t border-bone/10 px-[var(--gutter)] py-6 font-mono text-[10px] uppercase tracking-[0.2em] text-steel md:flex-row md:justify-between">
        <span>© {new Date().getFullYear()} Spider Masks — Proyecto de demostración. Precios ficticios.</span>
        <span>Diseños originales SPIDER MASKS. Sin afiliación con Marvel ni con personajes con licencia.</span>
      </div>
    </footer>
  );
}
