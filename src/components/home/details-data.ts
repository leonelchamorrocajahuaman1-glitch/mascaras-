import type { MaskKey } from "@/lib/types";

/** Capítulos de "The Details" (compartidos entre servidor y cliente). */
export const DETAIL_CHAPTERS = [
  { file: "eyes.webp", title: "Los ojos", kicker: "Primer plano", text: "Seis ojos: dos ranuras afiladas y cuatro lentes secundarias, con superficie micro-perforada. El punto exacto en el que la máscara te devuelve la mirada.", tags: ["Visor de 6 ojos", "Marco en relieve", "Micro-perforado"] },
  { file: "web-pattern.webp", title: "Las placas", kicker: "Patrón celular", text: "Una malla de placas irregulares en relieve recorre todo el cráneo, rematada por una cresta central que nace en la frente.", tags: ["Placas celulares", "Cresta central", "Relieve oscuro"] },
  { file: "textures.webp", title: "Texturas", kicker: "Superficie", text: "Grano de tejido, líneas elevadas y sombras que solo aparecen cuando la luz roza la superficie en ángulo.", tags: ["Grano fino", "Mate profundo", "Relieve"] },
  { file: "materials.webp", title: "Materiales", kicker: "Acabados", text: "Del tejido mate al metal rojo con nervaduras plateadas: cada edición responde a la luz de una forma distinta.", tags: ["Metalizado", "Plata", "Rojo profundo"] },
  { file: "reflections.webp", title: "Reflejos", kicker: "Brillo", text: "Lacado negro de brillo líquido. Los reflejos dibujan la forma del rostro antes que las propias placas.", tags: ["Clearcoat", "Negro lacado", "Luz de contorno"] },
  { file: "tech.webp", title: "Tecnología", kicker: "Future Vision", text: "Placas que laten como un circuito y un visor que se entrecierra. La malla, encendida.", tags: ["Placas emisivas", "Lentes activas", "Pulso"] },
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
  { model: "classic-red", cam: [0.95, -0.25, 1.45], target: [0.35, -0.3, 0.5], rotY: -0.55 },
  { model: "iron-edition", cam: [1.6, 0.35, 3.1], target: [0, 0.05, 0], rotY: -0.45 },
  { model: "black-symbiote", cam: [-1.1, 0.4, 2.6], target: [0, 0.1, 0], rotY: 0.4 },
  { model: "future-vision", cam: [0, 0.1, 3.6], target: [0, 0.05, 0], rotY: 0.15, squint: 0.35 },
];
