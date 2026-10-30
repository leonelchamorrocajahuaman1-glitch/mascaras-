"use client";

import { useRef, useState } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import { gsap, ScrollTrigger, useGSAP } from "@/lib/gsap";
import { pad } from "@/lib/format";
import { MASK_BY_KEY } from "@/lib/masks";
import { useGpuTier } from "@/lib/hooks/useMedia";
import { MaskArt } from "../three/MaskArt";
import { DETAIL_CHAPTERS, DETAIL_SHOTS } from "./details-data";

const SceneCanvas = dynamic(() => import("../three/SceneCanvas").then((m) => m.SceneCanvas), { ssr: false });
const DetailsScene = dynamic(() => import("../three/DetailsScene").then((m) => m.DetailsScene), { ssr: false });



export function Details({ images }: { images: Record<string, string | null> }) {
  const root = useRef<HTMLElement>(null);
  const [chapter, setChapter] = useState(0);
  const tier = useGpuTier();

  useGSAP(
    () => {
      gsap.utils.toArray<HTMLElement>(".detail-chapter").forEach((el, i) => {
        ScrollTrigger.create({
          trigger: el,
          start: "top 55%",
          end: "bottom 55%",
          onToggle: (self) => self.isActive && setChapter(i),
        });
        gsap.fromTo(
          el.querySelectorAll(".detail-in"),
          { opacity: 0, y: 40 },
          { opacity: 1, y: 0, stagger: 0.08, scrollTrigger: { trigger: el, start: "top 75%", end: "top 35%", scrub: true } },
        );
        const img = el.querySelector(".detail-img");
        if (img) {
          gsap.fromTo(img, { clipPath: "inset(100% 0 0 0)" }, { clipPath: "inset(0% 0 0 0)", ease: "power2.out", scrollTrigger: { trigger: img, start: "top 85%", end: "top 40%", scrub: true } });
        }
      });
      gsap.fromTo(
        ".detail-stage",
        { clipPath: "inset(18% 22% 18% 22% round 24px)" },
        { clipPath: "inset(0% 0% 0% 0% round 0px)", ease: "none", scrollTrigger: { trigger: root.current, start: "top bottom", end: "top top", scrub: true } },
      );
    },
    { scope: root },
  );

  const shot = DETAIL_SHOTS[chapter];

  return (
    <section ref={root} id="details" aria-label="The details" className="relative bg-ink">
      <div className="px-[var(--gutter)] pb-10 pt-32">
        <p className="mb-6 font-mono text-[11px] uppercase tracking-[0.35em] text-blood">( 03 ) — Macro</p>
        <h2 className="font-display text-[clamp(80px,12vw,220px)] font-black uppercase leading-[0.8] tracking-tight">
          The <span className="text-outline">Details</span>
        </h2>
      </div>
      <div className="relative lg:grid lg:grid-cols-2">
        <div className="sticky top-0 z-0 h-[55svh] lg:h-[100svh]">
          <div className="detail-stage relative h-full w-full overflow-hidden">
            <SceneCanvas
              className="absolute inset-0"
              camera={{ position: [0.42, 0.25, 1.25], fov: 35, near: 0.05 }}
              dpr={tier === "high" ? [1, 1.75] : [1, 1.25]}
              fallback={
                <div className="flex h-full items-center justify-center">
                  <MaskArt look={MASK_BY_KEY[shot.model].look} className="h-[70%] w-[70%]" />
                </div>
              }
            >
              <DetailsScene chapter={chapter} detail={tier} />
            </SceneCanvas>
            <div className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(80% 80% at 50% 50%, transparent 50%, rgba(5,5,6,0.9))" }} />
            <div className="hud-corners pointer-events-none absolute inset-6" />
            <div className="pointer-events-none absolute bottom-8 left-8 right-8 flex justify-between font-mono text-[10px] uppercase tracking-[0.3em] text-bone/70">
              <span>
                {pad(chapter + 1)} / {pad(DETAIL_CHAPTERS.length)} — {DETAIL_CHAPTERS[chapter].kicker}
              </span>
              <span className="text-blood">{MASK_BY_KEY[shot.model].name}</span>
            </div>
            <div className="pointer-events-none absolute left-1/2 top-1/2 h-16 w-16 -translate-x-1/2 -translate-y-1/2 opacity-40" aria-hidden>
              <span className="absolute left-1/2 top-0 h-full w-px bg-bone/40" />
              <span className="absolute left-0 top-1/2 h-px w-full bg-bone/40" />
            </div>
          </div>
        </div>
        <div className="relative z-10 -mt-[10svh] lg:mt-0">
          {DETAIL_CHAPTERS.map((c, i) => (
            <article
              key={c.title}
              className="detail-chapter flex min-h-[90svh] flex-col justify-center gap-6 bg-gradient-to-b from-transparent via-ink/90 to-transparent px-[var(--gutter)] py-24 lg:bg-none lg:pl-[6vw]"
            >
              <p className="detail-in flex items-center gap-4 font-mono text-[11px] uppercase tracking-[0.3em] text-steel">
                <span className={i === chapter ? "text-blood" : ""}>{pad(i + 1)}</span>
                <span className="h-px w-10 bg-bone/20" /> {c.kicker}
              </p>
              <h3 className="detail-in font-display text-[clamp(56px,7vw,130px)] font-black uppercase leading-[0.85]">{c.title}</h3>
              <p className="detail-in max-w-md text-[15px] leading-relaxed text-bone/70">{c.text}</p>
              <ul className="detail-in flex flex-wrap gap-2">
                {c.tags.map((t) => (
                  <li key={t} className="rounded-full border border-bone/15 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-bone/70">
                    {t}
                  </li>
                ))}
              </ul>
              {images[c.file] && (
                <div className="detail-img relative mt-4 aspect-[16/10] w-full max-w-lg overflow-hidden bg-coal">
                  <Image src={images[c.file]!} alt={`${c.title} — primer plano`} fill sizes="(max-width: 1024px) 90vw, 32rem" className="object-cover" />
                </div>
              )}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
