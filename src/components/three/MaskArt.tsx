import { useId } from "react";
import type { MaskLook } from "@/lib/masks";
import { EYE_CENTER, EYE_DOTS, EYE_POINTS } from "./eye";

/**
 * Ilustración vectorial de la máscara generada con las mismas proporciones que el modelo 3D.
 * Se usa como respaldo cuando no hay WebGL o mientras no existan las fotografías de producto.
 */
const SX = 0.75;
const SY = 1.02;
const toSvg = (x: number, y: number) => [50 + x * SX * 44, 52 - y * SY * 44] as const;

function silhouette() {
  const pts: string[] = [];
  for (let i = 0; i <= 96; i++) {
    const a = (i / 96) * Math.PI * 2;
    const x = Math.sin(a);
    const y = Math.cos(a);
    const t = Math.min(1, Math.max(0, (0.05 - y) / 1));
    const jaw = t * t * (3 - 2 * t);
    const k = 1 - 0.24 * jaw * jaw;
    const ky = y < -0.55 ? 1 - 0.1 * Math.min(1, (-0.55 - y) / 0.45) : 1;
    const [sx, sy] = toSvg(x * k * (y > 0 ? 1 + 0.05 * y : 1), y * ky);
    pts.push(`${i ? "L" : "M"}${sx.toFixed(2)} ${sy.toFixed(2)}`);
  }
  return pts.join(" ") + "Z";
}

/** Malla de placas hexagonales (proyección plana para la ilustración) + cresta central. */
function platePaths(density: number) {
  const r = 70 / density;
  const w = Math.sqrt(3) * r;
  const paths: string[] = [];
  for (let row = -1; row * 1.5 * r < 110; row++) {
    for (let col = -1; col * w < 110; col++) {
      const cx = col * w + (row % 2 ? w / 2 : 0);
      const cy = row * 1.5 * r;
      const pts = Array.from({ length: 6 }, (_, k) => {
        const a = (Math.PI / 3) * k + Math.PI / 6;
        return `${(cx + r * Math.cos(a)).toFixed(2)} ${(cy + r * Math.sin(a)).toFixed(2)}`;
      });
      paths.push(`M${pts.join(" L")}Z`);
    }
  }
  paths.push("M50 4 L50 30");
  return paths;
}

const scaled = (x: number, y: number, scale: number, mirror: boolean) => {
  const ex = EYE_CENTER[0] + (x - EYE_CENTER[0]) * scale;
  const ey = EYE_CENTER[1] + (y - EYE_CENTER[1]) * scale;
  return toSvg(mirror ? -ex : ex, ey);
};

/** Ranura principal + ojos secundarios del visor original. */
const eye = (mirror: boolean, scale: number) =>
  EYE_POINTS.map(([x, y], i) => {
    const [sx, sy] = scaled(x, y, scale, mirror);
    return `${i ? "L" : "M"}${sx.toFixed(2)} ${sy.toFixed(2)}`;
  }).join(" ") +
  "Z " +
  EYE_DOTS.map(([x, y, r]) => {
    const [cx, cy] = scaled(x, y, scale, mirror);
    const rr = r * scale * 44 * 0.88;
    return `M${(cx - rr).toFixed(2)} ${cy.toFixed(2)} a${rr.toFixed(2)} ${rr.toFixed(2)} 0 1 0 ${(2 * rr).toFixed(2)} 0 a${rr.toFixed(2)} ${rr.toFixed(2)} 0 1 0 ${(-2 * rr).toFixed(2)} 0Z`;
  }).join(" ");

const HEAD = silhouette();

export function MaskArt({ look, className, glow = true }: { look: MaskLook; className?: string; glow?: boolean }) {
  const id = useId().replace(/:/g, "");
  const web = platePaths(look.spokes);
  return (
    <svg viewBox="0 0 100 100" className={className} role="img" aria-label="Ilustración de la máscara">
      <defs>
        <radialGradient id={`shade-${id}`} cx="38%" cy="30%" r="80%">
          <stop offset="0%" stopColor={look.base} stopOpacity="1" />
          <stop offset="55%" stopColor={look.base} stopOpacity="0.85" />
          <stop offset="100%" stopColor="#000" stopOpacity="1" />
        </radialGradient>
        <linearGradient id={`lens-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={look.lens} />
          <stop offset="100%" stopColor={look.lens} stopOpacity="0.7" />
        </linearGradient>
        <clipPath id={`clip-${id}`}>
          <path d={HEAD} />
        </clipPath>
        <filter id={`glow-${id}`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2.4" />
        </filter>
      </defs>
      {glow && <path d={HEAD} fill="#e1121f" opacity="0.35" filter={`url(#glow-${id})`} transform="translate(0 1) scale(1)" />}
      <path d={HEAD} fill={`url(#shade-${id})`} />
      <g clipPath={`url(#clip-${id})`} fill="none" stroke={look.glowIntensity > 0 ? look.glow : look.web} strokeWidth="0.45" opacity="0.9">
        {web.map((d, i) => (
          <path key={i} d={d} />
        ))}
      </g>
      {[false, true].map((m) => (
        <g key={String(m)}>
          <path d={eye(m, look.lensScale)} fill={look.frame} stroke={look.frame} strokeWidth="2.6" strokeLinejoin="round" />
          <path
            d={eye(m, look.lensScale)}
            fill={`url(#lens-${id})`}
            transform={look.squint ? `translate(0 ${look.squint * 2}) scale(1 ${1 - look.squint * 0.5})` : undefined}
            style={{ transformOrigin: "50% 40%" }}
          />
        </g>
      ))}
      <path d={HEAD} fill="none" stroke="#000" strokeOpacity="0.6" strokeWidth="1.2" />
    </svg>
  );
}
