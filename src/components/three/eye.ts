/**
 * Diseño original SPIDER MASKS: visor arácnido con una ranura principal afilada por lado
 * y dos ojos secundarios redondos encima (seis ojos en total, como una araña real).
 * Coordenadas frontales de la esfera unitaria (x, y), lado derecho (x > 0).
 * Se comparte entre la geometría (CPU), el shader (GPU), la ilustración SVG y el logotipo.
 */
export const EYE_POINTS: [number, number][] = [
  [0.075, 0.115],
  [0.15, 0.175],
  [0.27, 0.235],
  [0.4, 0.29],
  [0.515, 0.335],
  [0.545, 0.3],
  [0.49, 0.245],
  [0.37, 0.18],
  [0.24, 0.115],
  [0.13, 0.08],
];

/** Ojos secundarios: [x, y, radio]. */
export const EYE_DOTS: [number, number, number][] = [
  [0.2, 0.33, 0.034],
  [0.33, 0.4, 0.026],
];

export const EYE_CENTER: [number, number] = [0.31, 0.22];
export const EYE_ROUND = 0.018;
export const FRAME_WIDTH = 0.026;
/** Punto del rostro desde el que se "enciende" el patrón en la animación de entrada. */
export const WEB_CENTER: [number, number] = [0, 0.11];

/** Distancia con signo al polígono (negativa dentro). Port de la función de Inigo Quilez. */
export function sdPolygon(px: number, py: number, pts: [number, number][]) {
  let d = (px - pts[0][0]) ** 2 + (py - pts[0][1]) ** 2;
  let s = 1;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i, i++) {
    const ex = pts[j][0] - pts[i][0];
    const ey = pts[j][1] - pts[i][1];
    const wx = px - pts[i][0];
    const wy = py - pts[i][1];
    const t = Math.min(1, Math.max(0, (wx * ex + wy * ey) / (ex * ex + ey * ey)));
    const bx = wx - ex * t;
    const by = wy - ey * t;
    d = Math.min(d, bx * bx + by * by);
    const c1 = py >= pts[i][1];
    const c2 = py < pts[j][1];
    const c3 = ex * wy > ey * wx;
    if ((c1 && c2 && c3) || (!c1 && !c2 && !c3)) s *= -1;
  }
  return s * Math.sqrt(d);
}

/** SDF de todas las lentes (ranura + ojos secundarios) con escala aplicada alrededor del centro. */
export function eyeSdf(x: number, y: number, scale = 1) {
  const ax = Math.abs(x);
  const qx = EYE_CENTER[0] + (ax - EYE_CENTER[0]) / scale;
  const qy = EYE_CENTER[1] + (y - EYE_CENTER[1]) / scale;
  let d = sdPolygon(qx, qy, EYE_POINTS) - EYE_ROUND;
  for (const [cx, cy, r] of EYE_DOTS) d = Math.min(d, Math.hypot(qx - cx, qy - cy) - r);
  return d * scale;
}
