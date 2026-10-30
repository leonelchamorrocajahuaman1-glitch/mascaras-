"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { MathUtils, Vector3, type Group } from "three";
import { MASK_BY_KEY } from "@/lib/masks";
import { MaskModel } from "./MaskModel";
import { StudioLights } from "./Lights";
import { DETAIL_SHOTS } from "../home/details-data";

const tmp = new Vector3();

export function DetailsScene({ chapter, detail }: { chapter: number; detail: "high" | "low" }) {
  const group = useRef<Group>(null);
  const target = useRef(new Vector3(0, 0, 0));
  const shot = DETAIL_SHOTS[Math.min(DETAIL_SHOTS.length - 1, Math.max(0, chapter))];
  const look = useMemo(
    () => ({ ...MASK_BY_KEY[shot.model].look, ...(shot.squint !== undefined ? { squint: shot.squint } : {}) }),
    [shot],
  );

  useFrame((state, delta) => {
    const k = 1 - Math.exp(-delta * 1.8);
    const t = state.clock.elapsedTime;
    state.camera.position.lerp(tmp.set(shot.cam[0] + Math.sin(t * 0.3) * 0.04, shot.cam[1] + Math.cos(t * 0.25) * 0.03, shot.cam[2]), k);
    target.current.lerp(tmp.set(...shot.target), k);
    state.camera.lookAt(target.current);
    if (group.current) group.current.rotation.y = MathUtils.lerp(group.current.rotation.y, shot.rotY + Math.sin(t * 0.2) * 0.05, k);
  });

  return (
    <>
      <color attach="background" args={["#050506"]} />
      <fog attach="fog" args={["#050506", 3, 9]} />
      <StudioLights />
      <group ref={group}>
        <MaskModel look={look} detail={detail} transition={2.2} />
      </group>
    </>
  );
}
