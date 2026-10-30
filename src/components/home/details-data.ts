import type { MaskKey } from "@/lib/types";

/** Capítulos de "The Details" (compartidos entre servidor y cliente). */
export const DETAIL_CHAPTERS = [
  { file: "eyes.webp", title: "Los ojos", kicker: "Primer plano", text: "Lentes de contorno grueso y superficie micro-perforada. El punto exacto en el que la máscara te devuelve la mirada.", tags: ["Marco en relieve", "Lente blanca", "Micro-perforado"] },
  { file: "web-pattern.webp", title: "La red", kicker: "Patrón de telaraña", text: "Radios que nacen entre los ojos y anillos que se comban entre ellos, envolviendo el cráneo sin interrupciones.", tags: ["18 radios", "Anillos combados", "Relieve oscuro"] },
  { file: "textures.webp", title: "Texturas", kicker: "Superficie", text: "Grano de tejido, líneas elevadas y sombras que solo aparecen cuando la luz roza la superficie en ángulo.", tags: ["Grano fino", "Mate profundo", "Relieve"] },
  { file: "materials.webp", title: "Materiales", kicker: "Acabados", text: "Del tejido mate al metal rojo con nervaduras plateadas: cada edición responde a la luz de una forma distinta.", tags: ["Metalizado", "Plata", "Rojo profundo"] },
  { file: "reflections.webp", title: "Reflejos", kicker: "Brillo", text: "Lacado negro de brillo líquido. Los reflejos dibujan la forma del rostro antes que la propia telaraña.", tags: ["Clearcoat", "Negro lacado", "Luz de contorno"] },
  { file: "tech.webp", title: "Tecnología", kicker: "Future Vision", text: "Líneas de luz que laten como un circuito y lentes que se entrecierran. La red, encendida.", tags: ["Red emisiva", "Lentes activas", "Pulso"] },
];

export interface DetailShot {
  model: MaskKey;
  cam: [number, number, number];
  target: [number, number, number];
  rotY: number;
  squint?: number;
}

/** Planos de cámara macro sobre el modelo real para cada capítulo de "The Details". */
export const DETAIL_SHOTS: DetailShot[] = [
  { model: "classic-red", cam: [0.42, 0.25, 1.25], target: [0.24, 0.18, 0.7], rotY: -0.2 },
  { model: "classic-red", cam: [-0.1, 1.15, 2.1], target: [0, 0.45, 0.2], rotY: 0.35 },
  { model: "stealth-edition", cam: [0.9, -0.2, 1.5], target: [0.35, -0.25, 0.5], rotY: -0.5 },
  { model: "iron-edition", cam: [1.6, 0.35, 3.1], target: [0, 0.05, 0], rotY: -0.45 },
  { model: "black-symbiote", cam: [-1.1, 0.4, 2.6], target: [0, 0.1, 0], rotY: 0.4 },
  { model: "future-vision", cam: [0, 0.1, 3.6], target: [0, 0.05, 0], rotY: 0.15, squint: 0.35 },
];
