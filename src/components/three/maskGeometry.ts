import { BufferAttribute, BufferGeometry, SphereGeometry } from "three";
import { mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { eyeSdf, FRAME_WIDTH } from "./eye";

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const g2 = (dx: number, dy: number, sx: number, sy: number) => Math.exp(-((dx * dx) / (2 * sx * sx) + (dy * dy) / (2 * sy * sy)));

/**
 * Cabeza esculpida proceduralmente a partir de una esfera: proporciones de cráneo,
 * mandíbula, nariz, pómulos, cuencas y relieve de los marcos de las lentes.
 * Es un modelo 3D real (malla con normales), no una imagen.
 */
function sculpt(x: number, y: number, z: number, lensScale: number): [number, number, number] {
  // Sección horizontal "cuadrada redondeada" (superelipse) en lugar de circular:
  // laterales y frente más planos, para que no parezca un huevo.
  const hr = Math.hypot(x, z);
  let sx = x, sz = z;
  if (hr > 1e-6) {
    const n = 3.2;
    const k = hr / Math.pow(Math.pow(Math.abs(x / hr), n) + Math.pow(Math.abs(z / hr), n), 1 / n);
    const b = 0.35; // mezcla círculo→superelipse
    sx = x * (1 + b * (k / hr - 1));
    sz = z * (1 + b * (k / hr - 1));
  }
  let px = sx * 0.66;
  let py = y * 1.14;
  let pz = sz * 0.8;

  // Coronilla más plana y frente alta.
  if (y > 0.55) py -= 0.1 * smooth(0.55, 1, y) * smooth(0.55, 1, y);
  // Pómulos anchos y sienes ligeramente hundidas.
  px *= 1 + 0.04 * g2(0, y + 0.02, 1, 0.25) - 0.03 * g2(0, y - 0.32, 1, 0.12);
  // Mandíbula angulosa: estrechamiento rápido bajo los pómulos y barbilla cuadrada.
  const jaw = smooth(-0.12, -0.8, y);
  px *= 1 - 0.3 * jaw;
  const chin = smooth(-0.62, -0.98, y);
  px *= 1 + 0.08 * chin * (1 - chin);
  if (y < -0.6) py = py * (1 - 0.14 * smooth(-0.6, -1, y)) - 0.02 * chin;
  // Nuca llena y cuello recogido; cara con plano frontal.
  if (z < 0) pz *= (1 + 0.1 * g2(0, y - 0.25, 1, 0.3)) * (1 - 0.55 * jaw);
  else {
    pz *= 1 - 0.08 * jaw;
    pz -= 0.05 * smooth(0.5, 1, z) * (1 - jaw * 0.5);
  }

  // Rasgos faciales (solo en la mitad frontal).
  let o = 0;
  const w = smooth(0.15, 0.6, z);
  if (w > 0) {
    const ax = Math.abs(x);
    let f = 0;
    f -= 0.05 * g2(ax - 0.31, y - 0.17, 0.13, 0.09); // cuencas
    f += 0.026 * g2(ax - 0.28, y - 0.33, 0.17, 0.05); // ceja
    f += 0.115 * g2(x, 0, 0.06, 1) * smooth(0.3, -0.08, y) * smooth(-0.3, -0.14, y); // tabique y punta
    f += 0.04 * g2(ax - 0.075, y + 0.18, 0.05, 0.04); // aletas
    f += 0.024 * g2(x, y + 0.31, 0.12, 0.04); // labio superior
    f -= 0.016 * g2(x, y + 0.375, 0.13, 0.014); // comisura
    f += 0.02 * g2(x, y + 0.43, 0.1, 0.035); // labio inferior
    f += 0.045 * g2(x, y + 0.64, 0.15, 0.08); // barbilla
    f += 0.028 * g2(ax - 0.43, y + 0.02, 0.1, 0.08); // pómulos
    f -= 0.022 * g2(ax - 0.37, y + 0.3, 0.1, 0.1); // mejillas
    f -= 0.02 * g2(ax - 0.62, y - 0.2, 0.08, 0.15); // sienes

    // Marco y lente en relieve.
    const e = eyeSdf(x, y, lensScale);
    const frame = smooth(FRAME_WIDTH + 0.02, FRAME_WIDTH - 0.004, e) * smooth(-0.05, -0.012, e);
    const lens = smooth(0.004, -0.03, e);
    f += Math.max(0.026 * frame, 0.016 * lens);
    o = f * w;
  }

  const len = Math.hypot(x, y, z) || 1;
  return [px + (x / len) * o, py + (y / len) * o, pz + (z / len) * o];
}

const cache = new Map<string, BufferGeometry>();

export function getMaskGeometry(lensScale = 1, detail: "high" | "low" = "high") {
  const key = `${lensScale}-${detail}`;
  const cached = cache.get(key);
  if (cached) return cached;

  const [ws, hs] = detail === "high" ? [360, 260] : [200, 150];
  let geo: BufferGeometry = new SphereGeometry(1, ws, hs);
  geo.deleteAttribute("uv");
  geo.deleteAttribute("normal");
  geo = mergeVertices(geo, 1e-5);

  const pos = geo.getAttribute("position") as BufferAttribute;
  const dir = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    dir[i * 3] = x;
    dir[i * 3 + 1] = y;
    dir[i * 3 + 2] = z;
    const [sx, sy, sz] = sculpt(x, y, z, lensScale);
    pos.setXYZ(i, sx, sy, sz);
  }
  geo.setAttribute("aDir", new BufferAttribute(dir, 3));
  geo.computeVertexNormals();
  geo.computeBoundingSphere();
  cache.set(key, geo);
  return geo;
}
