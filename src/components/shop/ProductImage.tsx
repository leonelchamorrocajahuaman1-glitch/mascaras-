import Image from "next/image";
import { MASK_BY_KEY } from "@/lib/masks";
import type { MaskKey } from "@/lib/types";
import { MaskArt } from "../three/MaskArt";

/** Imagen de producto optimizada con respaldo vectorial coherente con el diseño. */
export function ProductImage({
  src,
  alt,
  maskKey,
  sizes = "(max-width: 768px) 100vw, 50vw",
  priority,
  className,
  imgClassName,
}: {
  src: string | null;
  alt: string;
  maskKey: MaskKey;
  sizes?: string;
  priority?: boolean;
  className?: string;
  imgClassName?: string;
}) {
  if (!src) {
    return (
      <div className={`relative flex items-center justify-center ${className ?? ""}`}>
        <MaskArt look={MASK_BY_KEY[maskKey].look} className="h-[78%] w-[78%]" />
      </div>
    );
  }
  const external = src.startsWith("http") || src.startsWith("/api/");
  const isRender = src.includes("/images/renders/");
  return (
    <div className={`relative ${className ?? ""}`}>
      <Image src={src} alt={alt} fill sizes={sizes} priority={priority} unoptimized={external} className={imgClassName ?? (isRender ? "object-contain p-[6%]" : "object-cover")} />
    </div>
  );
}
