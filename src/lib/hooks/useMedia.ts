"use client";

import { useEffect, useState } from "react";

export function useMediaQuery(query: string, initial = false) {
  const [matches, setMatches] = useState(initial);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const update = () => setMatches(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, [query]);
  return matches;
}

export const useReducedMotion = () => useMediaQuery("(prefers-reduced-motion: reduce)");
export const useIsTouch = () => useMediaQuery("(hover: none), (pointer: coarse)");

let webglCache: boolean | null = null;
export function hasWebGL() {
  if (webglCache !== null) return webglCache;
  try {
    const c = document.createElement("canvas");
    webglCache = Boolean(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    webglCache = false;
  }
  return webglCache;
}

/** null mientras no se sabe (SSR), luego true/false. */
export function useWebGL() {
  const [ok, setOk] = useState<boolean | null>(null);
  useEffect(() => setOk(hasWebGL()), []);
  return ok;
}

/** Calidad adaptativa sencilla según el dispositivo. */
export function useGpuTier() {
  const [tier, setTier] = useState<"high" | "low">("high");
  useEffect(() => {
    const cores = navigator.hardwareConcurrency ?? 4;
    const mobile = window.matchMedia("(max-width: 768px), (pointer: coarse)").matches;
    setTier(mobile || cores <= 4 ? "low" : "high");
  }, []);
  return tier;
}

export function useHydrated() {
  const [h, setH] = useState(false);
  useEffect(() => setH(true), []);
  return h;
}
