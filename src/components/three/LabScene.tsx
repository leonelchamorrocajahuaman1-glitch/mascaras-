"use client";

import { forwardRef, Suspense, useEffect, useImperativeHandle, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { ContactShadows, OrbitControls } from "@react-three/drei";
import { Bloom, EffectComposer, Vignette } from "@react-three/postprocessing";
import { MathUtils, Spherical, Vector3, type Group } from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { gsap } from "@/lib/gsap";
import type { MaskChannel, MaskLook } from "@/lib/masks";
import { MaskModel, type MaskDrive } from "./MaskModel";
import { GLBMask } from "./GLBMask";
import { StudioLights, type LightRig } from "./Lights";
import { Particles } from "./Particles";

export interface LabApi {
  reset: () => void;
  zoom: (factor: number) => void;
  rotate: (radians: number) => void;
  capture: () => string | null;
}

export interface LabReadout {
  azimuth: number;
  polar: number;
  distance: number;
}

interface Props {
  look: MaskLook;
  modelKey: string;
  glbUrl?: string;
  channels: MaskChannel[];
  rig: LightRig;
  bloom: boolean;
  autoRotate: boolean;
  interactive: boolean;
  drive: React.RefObject<MaskDrive>;
  onReadout: (r: LabReadout) => void;
  detail: "high" | "low";
}

const HOME = new Vector3(0, 0.1, 5.2);
const MIN_D = 2.2;
const MAX_D = 8;

export const LabScene = forwardRef<LabApi, Props>(function LabScene(
  { look, modelKey, glbUrl, channels, rig, bloom, autoRotate, interactive, drive, onReadout, detail },
  ref,
) {
  const controls = useRef<OrbitControlsImpl>(null);
  const model = useRef<Group>(null);
  const { camera, gl, scene } = useThree();
  const lastReadout = useRef(0);

  useImperativeHandle(ref, () => ({
    reset() {
      const c = controls.current;
      if (!c) return;
      gsap.to(camera.position, { x: HOME.x, y: HOME.y, z: HOME.z, duration: 1.2, ease: "expo.inOut", onUpdate: () => c.update() });
      gsap.to(c.target, { x: 0, y: 0, z: 0, duration: 1.2, ease: "expo.inOut" });
    },
    zoom(factor) {
      const c = controls.current;
      if (!c) return;
      const dir = camera.position.clone().sub(c.target);
      const len = MathUtils.clamp(dir.length() * factor, MIN_D, MAX_D);
      const to = c.target.clone().add(dir.setLength(len));
      gsap.to(camera.position, { x: to.x, y: to.y, z: to.z, duration: 0.6, ease: "power3.out", onUpdate: () => c.update() });
    },
    rotate(radians) {
      const c = controls.current;
      if (!c) return;
      const offset = camera.position.clone().sub(c.target);
      const sph = new Spherical().setFromVector3(offset);
      const state = { theta: sph.theta };
      gsap.to(state, {
        theta: sph.theta + radians,
        duration: 0.8,
        ease: "power3.inOut",
        onUpdate: () => {
          sph.theta = state.theta;
          camera.position.copy(c.target).add(new Vector3().setFromSpherical(sph));
          c.update();
        },
      });
    },
    capture() {
      gl.render(scene, camera);
      try {
        return gl.domElement.toDataURL("image/png");
      } catch {
        return null;
      }
    },
  }));

  // Pequeña animación de "cambio de pieza".
  useEffect(() => {
    if (!model.current) return;
    gsap.fromTo(model.current.scale, { x: 0.86, y: 0.86, z: 0.86 }, { x: 1, y: 1, z: 1, duration: 1, ease: "expo.out" });
    gsap.fromTo(model.current.rotation, { y: model.current.rotation.y - 0.6 }, { y: 0, duration: 1.4, ease: "expo.out" });
  }, [modelKey]);

  useFrame((state) => {
    const c = controls.current;
    if (!c || state.clock.elapsedTime - lastReadout.current < 0.12) return;
    lastReadout.current = state.clock.elapsedTime;
    onReadout({
      azimuth: MathUtils.radToDeg(c.getAzimuthalAngle()),
      polar: MathUtils.radToDeg(c.getPolarAngle()),
      distance: camera.position.distanceTo(c.target),
    });
  });

  return (
    <>
      <color attach="background" args={["#060607"]} />
      <fog attach="fog" args={["#060607", 7, 14]} />
      <StudioLights rig={rig} />
      <group ref={model}>
        {glbUrl ? (
          <Suspense fallback={null}>
            <GLBMask url={glbUrl} look={look} channels={channels} />
          </Suspense>
        ) : (
          <MaskModel look={look} drive={drive} detail={detail} transition={4} />
        )}
      </group>
      <ContactShadows position={[0, -1.25, 0]} opacity={0.6} scale={6} blur={2.6} far={2} color="#000000" frames={1} />
      {rig.ambient && <Particles count={detail === "high" ? 380 : 160} spread={[8, 5, 5]} />}
      <OrbitControls
        ref={controls}
        makeDefault
        enabled={interactive}
        enablePan={false}
        enableDamping
        dampingFactor={0.08}
        rotateSpeed={0.7}
        zoomSpeed={0.8}
        minDistance={MIN_D}
        maxDistance={MAX_D}
        minPolarAngle={Math.PI * 0.18}
        maxPolarAngle={Math.PI * 0.82}
        autoRotate={autoRotate}
        autoRotateSpeed={0.9}
      />
      {bloom && (
        <EffectComposer multisampling={detail === "high" ? 4 : 0}>
          <Bloom mipmapBlur intensity={0.9} luminanceThreshold={0.55} luminanceSmoothing={0.2} />
          <Vignette offset={0.25} darkness={0.75} />
        </EffectComposer>
      )}
    </>
  );
});
