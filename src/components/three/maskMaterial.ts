import { Color, MeshPhysicalMaterial, type IUniform } from "three";
import type { MaskLook } from "@/lib/masks";
import { EYE_CENTER, EYE_DOTS, EYE_POINTS, EYE_ROUND, FRAME_WIDTH, WEB_CENTER } from "./eye";

const glslVec2 = (p: number[]) => `vec2(${p[0].toFixed(4)}, ${p[1].toFixed(4)})`;

const HEADER = /* glsl */ `
uniform vec3 uBase;
uniform vec3 uWeb;
uniform vec3 uLens;
uniform vec3 uFrame;
uniform vec3 uGlow;
uniform vec3 uLensGlow;
uniform float uGlowIntensity;
uniform float uLensGlowIntensity;
uniform float uSpokes;
uniform float uRingSpacing;
uniform float uWebWidth;
uniform float uLensScale;
uniform float uSquint;
uniform float uPulse;
uniform float uLensRim;
uniform float uTime;
uniform float uReveal;
uniform float uLensPower;
uniform float uBaseMetal;
uniform float uBaseRough;
uniform float uFrameMetal;
uniform float uBumpHeight;
varying vec3 vDir;

const vec2 SM_EYE[${EYE_POINTS.length}] = vec2[${EYE_POINTS.length}](${EYE_POINTS.map(glslVec2).join(", ")});
const vec2 SM_EYE_C = ${glslVec2(EYE_CENTER)};

float smPoly(vec2 p) {
  float d = dot(p - SM_EYE[0], p - SM_EYE[0]);
  float s = 1.0;
  for (int i = 0, j = ${EYE_POINTS.length - 1}; i < ${EYE_POINTS.length}; j = i, i++) {
    vec2 e = SM_EYE[j] - SM_EYE[i];
    vec2 w = p - SM_EYE[i];
    vec2 b = w - e * clamp(dot(w, e) / dot(e, e), 0.0, 1.0);
    d = min(d, dot(b, b));
    bvec3 c = bvec3(p.y >= SM_EYE[i].y, p.y < SM_EYE[j].y, e.x * w.y > e.y * w.x);
    if (all(c) || all(not(c))) s *= -1.0;
  }
  return s * sqrt(d);
}

float smEye(vec2 p, float scale, float squint) {
  vec2 q = vec2(abs(p.x), p.y);
  q = SM_EYE_C + (q - SM_EYE_C) / scale;
  q.y = SM_EYE_C.y + (q.y - SM_EYE_C.y) / max(1.0 - squint * 0.85, 0.04);
  float d = smPoly(q) - ${EYE_ROUND.toFixed(4)};
${EYE_DOTS.map(([x, y, r]) => `  d = min(d, length(q - vec2(${x.toFixed(4)}, ${y.toFixed(4)})) - ${r.toFixed(4)});`).join("\n")}
  return d * scale;
}

vec3 smHash3(vec3 p) {
  p = vec3(dot(p, vec3(127.1, 311.7, 74.7)), dot(p, vec3(269.5, 183.3, 246.1)), dot(p, vec3(113.5, 271.9, 124.6)));
  return fract(sin(p) * 43758.5453123);
}

/** Ruido celular 3D: distancia a la celda más cercana (x) y a la segunda (y). */
vec2 smWorley(vec3 x) {
  vec3 i = floor(x);
  vec3 f = fract(x);
  float f1 = 8.0;
  float f2 = 8.0;
  for (int k = -1; k <= 1; k++)
  for (int j = -1; j <= 1; j++)
  for (int l = -1; l <= 1; l++) {
    vec3 g = vec3(float(l), float(j), float(k));
    vec3 r = g + smHash3(i + g) * 0.8 + 0.1 - f;
    float d = dot(r, r);
    if (d < f1) { f2 = f1; f1 = d; } else if (d < f2) { f2 = d; }
  }
  return vec2(sqrt(f1), sqrt(f2));
}

float smHash(vec3 p) {
  p = fract(p * 0.3183099 + 0.1);
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}

float smNoise(vec3 x) {
  vec3 i = floor(x);
  vec3 f = fract(x);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(smHash(i), smHash(i + vec3(1, 0, 0)), f.x), mix(smHash(i + vec3(0, 1, 0)), smHash(i + vec3(1, 1, 0)), f.x), f.y),
             mix(mix(smHash(i + vec3(0, 0, 1)), smHash(i + vec3(1, 0, 1)), f.x), mix(smHash(i + vec3(0, 1, 1)), smHash(i + vec3(1, 1, 1)), f.x), f.y), f.z);
}

vec3 smPerturb(vec3 surf_pos, vec3 surf_norm, vec2 dHdxy, float faceDir) {
  vec3 vSigmaX = normalize(dFdx(surf_pos));
  vec3 vSigmaY = normalize(dFdy(surf_pos));
  vec3 R1 = cross(vSigmaY, surf_norm);
  vec3 R2 = cross(surf_norm, vSigmaX);
  float fDet = dot(vSigmaX, R1) * faceDir;
  vec3 vGrad = sign(fDet) * (dHdxy.x * R1 + dHdxy.y * R2);
  return normalize(abs(fDet) * surf_norm - vGrad);
}
`;

const PATTERN = /* glsl */ `
  vec3 smD = normalize(vDir);
  float smAA = length(fwidth(vDir)) * 0.75 + 1e-5;
  float smFront = smoothstep(0.12, 0.32, smD.z);
  vec2 smP = smD.xy;

  // Lentes y marcos
  float smOuter = smEye(smP, uLensScale, 0.0);
  float smLensD = smEye(smP, uLensScale, uSquint);
  float smLens = (1.0 - smoothstep(-smAA, smAA, smLensD)) * smFront;
  float smFrame = (1.0 - smoothstep(${FRAME_WIDTH.toFixed(4)} - smAA, ${FRAME_WIDTH.toFixed(4)} + smAA, smOuter)) * smFront * (1.0 - smLens);

  // Patrón original: placas celulares en relieve + cresta central
  vec3 smC = normalize(vec3(${WEB_CENTER[0].toFixed(3)}, ${WEB_CENTER[1].toFixed(3)}, 1.0));
  float smTh = acos(clamp(dot(smD, smC), -1.0, 1.0));
  float smScale = uSpokes * 0.34;
  vec2 smCell = smWorley(smD * smScale);
  float smCellEdge = (smCell.y - smCell.x) * 0.5 / smScale;
  float smEaa = fwidth(smCellEdge) * 0.75 + 1e-5;
  float smW = uWebWidth;
  float smLine = 1.0 - smoothstep(smW - smEaa, smW + smEaa, smCellEdge);
  float smCrest = (1.0 - smoothstep(smW * 1.4 - smAA, smW * 1.4 + smAA, abs(smD.x))) * smoothstep(0.32, 0.5, smD.y + smD.z * 0.15);
  smLine = max(smLine, smCrest);
  smLine *= mix(1.0, smoothstep(${FRAME_WIDTH.toFixed(4)}, ${FRAME_WIDTH.toFixed(4)} + 0.014, smOuter), smFront);

  // Revelado progresivo desde el centro (animación de entrada)
  float smRv = uReveal * 3.5;
  float smVis = 1.0 - smoothstep(smRv - 0.1, smRv, smTh);
  float smEdge = exp(-abs(smTh - smRv) * 18.0) * (1.0 - step(0.999, uReveal));
  smLine *= smVis;

  float smGrain = smNoise(vDir * 260.0);
  float smGrain2 = smNoise(vDir * 38.0);

  // Micro-perforado de la lente
  vec2 smPerf = fract(smP * 150.0) - 0.5;
  float smDot = smoothstep(0.34, 0.2, length(smPerf)) * (1.0 - smoothstep(0.002, 0.006, smAA));
  float smLensShade = 0.72 + 0.28 * smoothstep(0.0, -0.07, smLensD);
  float smRim = smoothstep(-0.035, 0.0, smLensD);

  // Tejido técnico: trama de tela en relieve (coordenadas esféricas).
  vec2 smUV = vec2(atan(vDir.x, vDir.z) * 0.64, vDir.y) * 120.0;
  vec2 smCellT = fract(smUV) - 0.5;
  float smRow = mod(floor(smUV.y), 2.0);
  float smWeave = smoothstep(0.5, 0.15, length(vec2(smCellT.x + smRow * 0.25, smCellT.y * 1.4)));
  smWeave = mix(0.5, smWeave, 1.0 - smoothstep(0.25, 0.6, max(fwidth(smUV.x), fwidth(smUV.y))));
  smWeave *= 1.0 * (1.0 - smLens) * (1.0 - smFrame);
  vec3 smCol = uBase * (0.9 + 0.1 * smGrain) * (0.94 + 0.06 * smGrain2) * (0.82 + 0.18 * smWeave);
  smCol = mix(smCol, uWeb, smLine);
  smCol = mix(smCol, uFrame, smFrame);
  vec3 smLensCol = uLens * smLensShade * (1.0 - 0.08 * smDot) * mix(0.08, 1.0, uLensPower);
  smCol = mix(smCol, smLensCol, smLens);

  float smRough = uBaseRough + (smGrain - 0.5) * 0.12 + (0.5 - smWeave) * 0.18;
  smRough = mix(smRough, uBaseRough * 0.75, smLine);
  smRough = mix(smRough, 0.32, smFrame);
  smRough = mix(smRough, 0.07, smLens);

  float smMetal = mix(uBaseMetal, max(uBaseMetal, uFrameMetal), smLine);
  smMetal = mix(smMetal, uFrameMetal, smFrame);
  smMetal = mix(smMetal, 0.0, smLens);

  float smPulse = mix(1.0, 0.45 + 0.55 * (0.5 + 0.5 * sin(smTh * 9.0 - uTime * 2.6)), uPulse);
  vec3 smEm = uGlow * uGlowIntensity * smLine * smPulse;
  smEm += uLensGlow * uLensGlowIntensity * smLens * uLensPower * mix(1.0, smRim, uLensRim);
  smEm += vec3(1.0, 0.06, 0.1) * smEdge * (0.15 + 2.2 * smLine) * smoothstep(0.0, 0.05, uReveal);

  float smH = smLine * 0.9 + smFrame * 1.1 + smLens * 0.4 + smGrain * 0.12 + smWeave * 0.22;
`;

export type MaskUniforms = Record<string, IUniform>;

export function createMaskMaterial() {
  const uniforms: MaskUniforms = {
    uBase: { value: new Color("#a30f19") },
    uWeb: { value: new Color("#14080a") },
    uLens: { value: new Color("#f3f3f1") },
    uFrame: { value: new Color("#070707") },
    uGlow: { value: new Color("#000000") },
    uLensGlow: { value: new Color("#ffffff") },
    uGlowIntensity: { value: 0 },
    uLensGlowIntensity: { value: 0 },
    uSpokes: { value: 18 },
    uRingSpacing: { value: 0.15 },
    uWebWidth: { value: 0.0065 },
    uLensScale: { value: 1 },
    uSquint: { value: 0 },
    uPulse: { value: 0 },
    uLensRim: { value: 0 },
    uTime: { value: 0 },
    uReveal: { value: 1 },
    uLensPower: { value: 1 },
    uBaseMetal: { value: 0.05 },
    uBaseRough: { value: 0.55 },
    uFrameMetal: { value: 0.1 },
    uBumpHeight: { value: 0.0035 },
  };

  const material = new MeshPhysicalMaterial({
    color: "#ffffff",
    roughness: 0.5,
    metalness: 0,
    clearcoat: 0.2,
    clearcoatRoughness: 0.28,
    sheen: 0.5,
    sheenRoughness: 0.55,
    sheenColor: new Color("#ff4b4b"),
    envMapIntensity: 0.7,
  });

  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nattribute vec3 aDir;\nvarying vec3 vDir;")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\nvDir = aDir;");
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", `#include <common>\n${HEADER}`)
      .replace("#include <color_fragment>", `#include <color_fragment>\n${PATTERN}\n  diffuseColor.rgb = smCol;`)
      .replace("#include <roughnessmap_fragment>", "#include <roughnessmap_fragment>\n  roughnessFactor = clamp(smRough, 0.04, 1.0);")
      .replace("#include <metalnessmap_fragment>", "#include <metalnessmap_fragment>\n  metalnessFactor = clamp(smMetal, 0.0, 1.0);")
      .replace(
        "#include <normal_fragment_maps>",
        `#include <normal_fragment_maps>
  {
    float smPw = max(length(dFdx(vViewPosition)), 1e-5);
    vec2 smDh = vec2(dFdx(smH), dFdy(smH)) * uBumpHeight / smPw;
    float smDl = length(smDh);
    if (smDl > 1.6) smDh *= 1.6 / smDl;
    normal = smPerturb(-vViewPosition, normal, smDh, faceDirection);
  }`,
      )
      .replace("#include <emissivemap_fragment>", "#include <emissivemap_fragment>\n  totalEmissiveRadiance += smEm;");
  };
  material.customProgramCacheKey = () => "spider-mask-v3-fabric";

  return { material, uniforms };
}

const tmp = new Color();

/** Interpola los uniformes hacia un look objetivo (k = 1 aplica de inmediato). */
export function lerpLook(material: MeshPhysicalMaterial, u: MaskUniforms, look: MaskLook, k: number) {
  const col = (name: string, hex: string) => (u[name].value as Color).lerp(tmp.set(hex), k);
  const num = (name: string, v: number) => (u[name].value = u[name].value + (v - u[name].value) * k);
  col("uBase", look.base);
  col("uWeb", look.web);
  col("uLens", look.lens);
  col("uFrame", look.frame);
  col("uGlow", look.glow);
  col("uLensGlow", look.lensGlow);
  num("uGlowIntensity", look.glowIntensity);
  num("uLensGlowIntensity", look.lensGlowIntensity);
  num("uRingSpacing", look.ringSpacing);
  num("uWebWidth", look.webWidth);
  num("uLensScale", look.lensScale);
  num("uSquint", look.squint);
  num("uPulse", look.pulse);
  num("uLensRim", look.lensRim);
  num("uBaseMetal", look.metalness);
  num("uBaseRough", look.roughness);
  num("uFrameMetal", look.metalness > 0.5 ? 0.92 : 0.15);
  u.uSpokes.value = look.spokes;
  material.clearcoat += (Math.max(0.02, look.clearcoat) - material.clearcoat) * k;
  material.sheen += (Math.max(0.02, look.sheen) - material.sheen) * k;
  material.sheenColor.lerp(tmp.set(look.base).offsetHSL(0, 0, 0.2), k);
}
