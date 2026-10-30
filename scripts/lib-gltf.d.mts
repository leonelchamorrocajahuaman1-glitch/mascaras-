export interface GltfInspection {
  ok: boolean;
  issues: string[];
  warnings: string[];
  stats: { sizeMB: number; meshes: number; materials: string[]; textures: number; animations: number; extensions: string[]; generator: string };
}
export function inspectGltf(file: string): GltfInspection;
