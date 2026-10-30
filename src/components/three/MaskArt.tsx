import { useId } from "react";
import type { MaskLook } from "@/lib/masks";
import { EYE_CENTER, EYE_POINTS, WEB_CENTER } from "./eye";

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

function webPaths(spokes: number, ringSpacing: number) {
  const c = [WEB_CENTER[0], WEB_CENTER[1], 1];
  const n = Math.hypot(c[0], c[1], c[2]);
  const cz = [c[0] / n, c[1] / n, c[2] / n];
  const rx = [1, 0, 0];
  const ry = [cz[1] * rx[2] - cz[2] * rx[1], cz[2] * rx[0] - cz[0] * rx[2], cz[0] * rx[1] - cz[1] * rx[0]].map((v) => -v);
  const point = (th: number, ph: number) => {
    const s = Math.sin(th);
    const d = [0, 1, 2].map((k) => Math.cos(th) * cz[k] + s * (Math.cos(ph) * rx[k] + Math.sin(ph) * ry[k]));
    return d;
  };
  const paths: string[] = [];
  for (let i = 0; i < spokes; i++) {
    const ph = (i / spokes) * Math.PI * 2;
    const seg: string[] = [];
    for (let th = 0.03; th < 1.7; th += 0.04) {
      const d = point(th, ph);
      if (d[2] < 0) break;
      const [x, y] = toSvg(d[0], d[1]);
      seg.push(`${seg.length ? "L" : "M"}${x.toFixed(2)} ${y.toFixed(2)}`);
    }
    paths.push(seg.join(" "));
  }
  for (let r = 1; r * ringSpacing < 1.7; r++) {
    const seg: string[] = [];
    for (let j = 0; j <= spokes * 8; j++) {
      const ph = (j / (spokes * 8)) * Math.PI * 2;
      const ds = Math.abs(((((ph * spokes) / (Math.PI * 2) + 0.5) % 1) + 1) % 1 - 0.5);
      const th = (r - 0.34 * (2 * ds) ** 2) * ringSpacing;
      const d = point(th, ph);
      if (d[2] < 0) {
        seg.push("");
        continue;
      }
      const [x, y] = toSvg(d[0], d[1]);
      const prevBlank = !seg.length || seg[seg.length - 1] === "";
      seg.push(`${prevBlank ? "M" : "L"}${x.toFixed(2)} ${y.toFixed(2)}`);
    }
    paths.push(seg.filter(Boolean).join(" "));
  }
  return paths;
}

const eye = (mirror: boolean, scale: number) =>
  EYE_POINTS.map(([x, y], i) => {
    const ex = EYE_CENTER[0] + (x - EYE_CENTER[0]) * scale;
    const ey = EYE_CENTER[1] + (y - EYE_CENTER[1]) * scale;
    const [sx, sy] = toSvg(mirror ? -ex : ex, ey);
    return `${i ? "L" : "M"}${sx.toFixed(2)} ${sy.toFixed(2)}`;
  }).join(" ") + "Z";

const HEAD = silhouette();

export function MaskArt({ look, className, glow = true }: { look: MaskLook; className?: string; glow?: boolean }) {
  const id = useId().replace(/:/g, "");
  const web = webPaths(look.spokes, look.ringSpacing);
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
          <path d={eye(m, look.lensScale)} fill={look.frame} stroke={look.frame} strokeWidth="4.2" strokeLinejoin="round" />
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
