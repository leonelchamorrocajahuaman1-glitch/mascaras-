"use client";

import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { MathUtils, type Group } from "three";
import { MASK_BY_KEY } from "@/lib/masks";
import { useExperience } from "@/lib/store/experience";
import { MaskModel, type MaskDrive } from "./MaskModel";
import { Particles } from "./Particles";
import { StudioLights } from "./Lights";

export interface HeroDrive extends MaskDrive {
  /** Progreso del scroll del hero (0 → 1). */
  scroll: number;
  /** Entrada (0 → 1). */
  intro: number;
  pointerX: number;
  pointerY: number;
}

export function HeroScene({ drive, detail }: { drive: React.RefObject<HeroDrive>; detail: "high" | "low" }) {
  const group = useRef<Group>(null);
  const rig = useRef<Group>(null);
  const frames = useRef(0);
  const setSceneReady = useExperience((s) => s.setSceneReady);
  const { size, camera } = useThree();
  const look = MASK_BY_KEY["classic-red"].look;

  useEffect(() => {
    // En pantallas estrechas se aleja la cámara para que la máscara quepa.
    const aspect = size.width / size.height;
    camera.position.z = aspect < 0.8 ? 6.8 : aspect < 1.2 ? 5.8 : 5.1;
    camera.updateProjectionMatrix();
  }, [size, camera]);

  useFrame((state, delta) => {
    if (frames.current < 3 && ++frames.current === 3) setSceneReady();
    const d = drive.current;
    if (!group.current || !rig.current || !d) return;
    const t = state.clock.elapsedTime;
    const k = 1 - Math.exp(-delta * 3.2);

    // Mirada que sigue al cursor + flotación.
    const targetY = d.pointerX * 0.42 - Math.min(d.scroll * 1.6, 1) * 0.75 + (1 - d.intro) * -0.7;
    const targetX = -d.pointerY * 0.22 + Math.sin(t * 0.5) * 0.03 + Math.min(d.scroll * 1.6, 1) * 0.12;
    group.current.rotation.y = MathUtils.lerp(group.current.rotation.y, targetY, k);
    group.current.rotation.x = MathUtils.lerp(group.current.rotation.x, targetX, k);
    group.current.rotation.z = MathUtils.lerp(group.current.rotation.z, d.pointerX * -0.05, k);

    const aspect = size.width / size.height;
    const shiftX = aspect > 1 ? Math.min(d.scroll * 1.6, 1) * 0.95 : 0;
    rig.current.position.x = MathUtils.lerp(rig.current.position.x, shiftX, k);
    rig.current.position.y = MathUtils.lerp(rig.current.position.y, Math.sin(t * 0.8) * 0.04 - (1 - d.intro) * 0.35 - d.scroll * 0.1, k);
    rig.current.position.z = MathUtils.lerp(rig.current.position.z, -(1 - d.intro) * 1.6 - Math.min(d.scroll * 1.6, 1) * 0.5, k);

    state.camera.position.x = MathUtils.lerp(state.camera.position.x, d.pointerX * 0.15, k * 0.5);
    state.camera.position.y = MathUtils.lerp(state.camera.position.y, d.pointerY * 0.1, k * 0.5);
    state.camera.lookAt(0, 0, 0);
  });

  return (
    <>
      <fog attach="fog" args={["#050506", 5, 11]} />
      <StudioLights />
      <group ref={rig}>
        <group ref={group}>
          <MaskModel look={look} drive={drive} detail={detail} />
        </group>
      </group>
      <Particles count={detail === "high" ? 650 : 280} />
    </>
  );
}
