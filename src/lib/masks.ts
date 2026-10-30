import type { MaskKey } from "./types";

export type MaskChannel = "base" | "web" | "lens" | "glow";

export interface MaskLook {
  base: string;
  web: string;
  lens: string;
  frame: string;
  /** Color emisivo de las líneas de telaraña (negro = sin brillo). */
  glow: string;
  glowIntensity: number;
  lensGlow: string;
  lensGlowIntensity: number;
  metalness: number;
  roughness: number;
  clearcoat: number;
  sheen: number;
  /** Número de radios de la telaraña. */
  spokes: number;
  /** Separación angular entre anillos de la telaraña. */
  ringSpacing: number;
  webWidth: number;
  /** Escala de las lentes (1 = tamaño clásico). */
  lensScale: number;
  /** Apertura de las lentes (0 = abiertas, 1 = cerradas). */
  squint: number;
  /** Latido de las líneas emisivas. */
  pulse: number;
  /** 1 = el brillo de la lente se concentra en el borde (lentes ahumadas). */
  lensRim: number;
}

export interface MaskDefinition {
  key: MaskKey;
  code: string;
  name: string;
  tagline: string;
  description: string;
  accent: string;
  look: MaskLook;
  /** Canales de color que el usuario puede modificar en el laboratorio 3D. */
  customizable: MaskChannel[];
  swatches: Partial<Record<MaskChannel, string[]>>;
}

const base: Omit<MaskLook, "base" | "web" | "lens" | "frame"> = {
  glow: "#000000",
  glowIntensity: 0,
  lensGlow: "#ffffff",
  lensGlowIntensity: 0.04,
  metalness: 0.05,
  roughness: 0.55,
  clearcoat: 0.15,
  sheen: 0.6,
  spokes: 18,
  ringSpacing: 0.15,
  webWidth: 0.0065,
  lensScale: 1,
  squint: 0,
  pulse: 0,
  lensRim: 0,
};

export const MASKS: MaskDefinition[] = [
  {
    key: "classic-red",
    code: "SM—01",
    name: "Classic Red",
    tagline: "El origen de la leyenda.",
    description:
      "Rojo profundo, telaraña en relieve oscuro y lentes blancas de contorno grueso. La silueta que todos reconocen, reinterpretada con acabado de estudio.",
    accent: "#e1121f",
    look: { ...base, base: "#a30f19", web: "#14080a", lens: "#f3f3f1", frame: "#070707" },
    customizable: ["base", "web"],
    swatches: {
      base: ["#a30f19", "#7d0a12", "#c4161f", "#5a070d"],
      web: ["#14080a", "#2b2d33", "#8b8f96", "#e6e6e6"],
    },
  },
  {
    key: "black-symbiote",
    code: "SM—02",
    name: "Black Symbiote",
    tagline: "Oscuridad líquida.",
    description:
      "Negro lacado de brillo profundo, lentes amplias y una telaraña casi invisible que solo aparece cuando la luz la roza.",
    accent: "#f2f2f2",
    look: {
      ...base,
      base: "#08080a",
      web: "#1d1d22",
      lens: "#f7f7f7",
      frame: "#000000",
      roughness: 0.18,
      clearcoat: 1,
      sheen: 0,
      metalness: 0.2,
      lensScale: 1.16,
      spokes: 14,
      lensGlowIntensity: 0.08,
    },
    customizable: [],
    swatches: {},
  },
  {
    key: "iron-edition",
    code: "SM—03",
    name: "Iron Edition",
    tagline: "Blindaje rojo, alma de acero.",
    description:
      "Superficie metalizada roja con nervaduras plateadas y marcos de lente en gris metálico. Una lectura industrial del icono.",
    accent: "#c9ccd2",
    look: {
      ...base,
      base: "#8f0d15",
      web: "#a9adb5",
      lens: "#eef3ff",
      frame: "#8b8f96",
      metalness: 0.85,
      roughness: 0.3,
      clearcoat: 0.6,
      sheen: 0,
      webWidth: 0.008,
      lensGlowIntensity: 0.35,
    },
    customizable: [],
    swatches: {},
  },
  {
    key: "future-vision",
    code: "SM—04",
    name: "Future Vision",
    tagline: "La red se enciende.",
    description:
      "Grafito técnico atravesado por líneas de luz roja que laten como un circuito vivo. Lentes con resplandor ambiental.",
    accent: "#ff2a3a",
    look: {
      ...base,
      base: "#111216",
      web: "#ff1a2d",
      lens: "#ffe9ea",
      frame: "#1a1c21",
      glow: "#ff1a2d",
      glowIntensity: 2.4,
      lensGlow: "#ff3344",
      lensGlowIntensity: 0.9,
      metalness: 0.6,
      roughness: 0.38,
      clearcoat: 0.8,
      sheen: 0,
      spokes: 22,
      pulse: 1,
    },
    customizable: ["glow"],
    swatches: { glow: ["#ff1a2d", "#ffffff", "#ff5a1f", "#c8ccd4"] },
  },
  {
    key: "stealth-edition",
    code: "SM—05",
    name: "Stealth Edition",
    tagline: "Invisible hasta que es tarde.",
    description:
      "Negro mate absoluto, telaraña en gris carbón y lentes ahumadas entrecerradas con un filo de luz roja.",
    accent: "#8b8f96",
    look: {
      ...base,
      base: "#060607",
      web: "#1f2024",
      lens: "#2a2c31",
      frame: "#000000",
      lensGlow: "#ff1022",
      lensGlowIntensity: 0.55,
      roughness: 0.86,
      clearcoat: 0,
      sheen: 0.25,
      squint: 0.42,
      lensRim: 1,
    },
    customizable: [],
    swatches: {},
  },
  {
    key: "custom-series",
    code: "SM—06",
    name: "Custom Series",
    tagline: "Tu máscara, tus reglas.",
    description:
      "Base, telaraña y lentes configurables. Diseña tu combinación en el 3D Mask Lab y llévala a la tienda.",
    accent: "#ffffff",
    look: { ...base, base: "#e9e9ea", web: "#c4101c", lens: "#101013", frame: "#c4101c", roughness: 0.45, sheen: 0.3 },
    customizable: ["base", "web", "lens"],
    swatches: {
      base: ["#e9e9ea", "#a30f19", "#08080a", "#8b8f96"],
      web: ["#c4101c", "#14080a", "#e6e6e6", "#a9adb5"],
      lens: ["#101013", "#f3f3f1", "#ff2a3a", "#6c7078"],
    },
  },
];

export const MASK_BY_KEY = Object.fromEntries(MASKS.map((m) => [m.key, m])) as Record<MaskKey, MaskDefinition>;

export const MASK_KEYS = MASKS.map((m) => m.key) as [MaskKey, ...MaskKey[]];

export function maskImagePath(key: MaskKey) {
  return `/images/masks/${key}.webp`;
}

export function maskModelPath(key: MaskKey) {
  return `/models/${key}.glb`;
}
