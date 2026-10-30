/** Cinta de texto infinita (CSS puro, se detiene con movimiento reducido). */
export function Marquee({ items, className, speed = 40 }: { items: string[]; className?: string; speed?: number }) {
  const row = (
    <div className="flex shrink-0 items-center gap-[4vw] pr-[4vw]">
      {items.map((t, i) => (
        <span key={i} className="flex items-center gap-[4vw]">
          {t}
          <svg viewBox="0 0 24 24" className="h-[0.5em] w-[0.5em] text-blood" aria-hidden>
            <path d="M12 0l2.6 9.4L24 12l-9.4 2.6L12 24l-2.6-9.4L0 12l9.4-2.6z" fill="currentColor" />
          </svg>
        </span>
      ))}
    </div>
  );
  return (
    <div className={`flex overflow-hidden whitespace-nowrap ${className ?? ""}`} aria-hidden>
      <div className="flex motion-safe:animate-[marquee_var(--s)_linear_infinite]" style={{ ["--s" as string]: `${speed}s` }}>
        {row}
        {row}
      </div>
      <style>{`@keyframes marquee { from { transform: translateX(0) } to { transform: translateX(-50%) } }`}</style>
    </div>
  );
}
