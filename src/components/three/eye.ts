/**
 * Contorno de la lente derecha en coordenadas frontales de la esfera unitaria (x, y).
 * Se comparte entre la geometría (CPU), el shader (GPU) y la ilustración SVG de respaldo.
 */
export const EYE_POINTS: [number, number][] = [
  [0.075, 0.095],
  [0.09, 0.17],
  [0.14, 0.235],
  [0.22, 0.285],
  [0.32, 0.318],
  [0.43, 0.338],
  [0.52, 0.345],
  [0.535, 0.275],
  [0.495, 0.185],
  [0.425, 0.105],
  [0.325, 0.05],
  [0.205, 0.032],
  [0.12, 0.052],
];

export const EYE_CENTER: [number, number] = [0.31, 0.19];
export const EYE_ROUND = 0.022;
export const FRAME_WIDTH = 0.042;
/** Punto entre los ojos desde el que irradia la telaraña. */
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

/** SDF de la lente con escala (tamaño) aplicada alrededor del centro del ojo. */
export function eyeSdf(x: number, y: number, scale = 1) {
  const ax = Math.abs(x);
  const qx = EYE_CENTER[0] + (ax - EYE_CENTER[0]) / scale;
  const qy = EYE_CENTER[1] + (y - EYE_CENTER[1]) / scale;
  return sdPolygon(qx, qy, EYE_POINTS) * scale - EYE_ROUND;
}
