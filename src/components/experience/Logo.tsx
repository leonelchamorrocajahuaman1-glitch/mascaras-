import { EYE_POINTS } from "../three/eye";

/** Marca de la casa: las dos lentes de la máscara (mismo contorno que el modelo 3D). */
const eyePath = (mirror: boolean) =>
  EYE_POINTS.map(([x, y], i) => `${i ? "L" : "M"}${(50 + (mirror ? -x : x) * 80).toFixed(1)} ${(52 - y * 80).toFixed(1)}`).join(" ") + "Z";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden>
      <path d={eyePath(false)} fill="currentColor" stroke="currentColor" strokeWidth="5" strokeLinejoin="round" />
      <path d={eyePath(true)} fill="currentColor" stroke="currentColor" strokeWidth="5" strokeLinejoin="round" />
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={`flex items-center gap-2.5 ${className ?? ""}`}>
      <LogoMark className="h-6 w-6 text-blood" />
      <span className="font-display text-[19px] font-extrabold uppercase leading-none tracking-[0.08em]">
        Spider<span className="text-blood">/</span>Masks
      </span>
    </span>
  );
}
