"use client";

import { useEffect, useRef, useState } from "react";

/** Monta su contenido solo cuando se acerca al viewport (ahorra contextos WebGL y memoria). */
export function LazyMount({ children, minHeight = "100svh", margin = "800px" }: { children: React.ReactNode; minHeight?: string; margin?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (!ref.current) return;
    const io = new IntersectionObserver(([e]) => e.isIntersecting && setShow(true), { rootMargin: margin });
    io.observe(ref.current);
    return () => io.disconnect();
  }, [margin]);
  return (
    <div ref={ref} style={show ? undefined : { minHeight }}>
      {show ? children : null}
    </div>
  );
}
