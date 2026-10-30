"use client";

import { Environment, Lightformer } from "@react-three/drei";

export interface LightRig {
  key: boolean;
  rim: boolean;
  ambient: boolean;
}

/** Iluminación de estudio cinematográfica: luz principal fría, contraluces rojos y reflejos procedurales (sin HDR externos). */
export function StudioLights({ rig = { key: true, rim: true, ambient: true }, intensity = 1 }: { rig?: LightRig; intensity?: number }) {
  return (
    <>
      <ambientLight color="#ff2233" intensity={rig.ambient ? 0.06 * intensity : 0.02} />
      <hemisphereLight color="#ffffff" groundColor="#2a0005" intensity={rig.ambient ? 0.08 * intensity : 0.01} />
      {rig.key && <directionalLight position={[2.4, 3.6, 2.6]} intensity={1.5 * intensity} color="#fff3ee" />}
      {rig.key && <directionalLight position={[-3, 0.5, 3]} intensity={0.35 * intensity} color="#b9c4ff" />}
      {rig.rim && <directionalLight position={[-4, 1.6, -2.4]} intensity={9 * intensity} color="#ff1a2d" />}
      {rig.rim && <directionalLight position={[4.2, 0.4, -2]} intensity={7 * intensity} color="#ff2f40" />}
      {rig.rim && <pointLight position={[0, -2.4, 1.2]} intensity={1.6 * intensity} distance={6} color="#ff0a1e" />}
      <Environment resolution={256} frames={1}>
        <Lightformer form="rect" intensity={rig.key ? 1.6 : 0.2} color="#ffffff" position={[0, 4, 2]} rotation-x={Math.PI / 2} scale={[6, 1.2, 1]} />
        <Lightformer form="rect" intensity={rig.key ? 0.6 : 0.05} color="#ffffff" position={[3, 1, 4]} scale={[2, 3, 1]} />
        <Lightformer form="rect" intensity={rig.rim ? 5 : 0.2} color="#ff1428" position={[-5, 0.5, -2]} rotation-y={Math.PI / 2} scale={[4, 6, 1]} />
        <Lightformer form="rect" intensity={rig.rim ? 4 : 0.2} color="#ff2a3a" position={[5, 0, -2]} rotation-y={-Math.PI / 2} scale={[4, 6, 1]} />
        <Lightformer form="ring" intensity={rig.ambient ? 0.6 : 0.05} color="#ff3040" position={[0, -3, 3]} scale={3} />
      </Environment>
    </>
  );
}
