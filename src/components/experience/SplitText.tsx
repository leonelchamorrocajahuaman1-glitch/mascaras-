import { Fragment } from "react";

/**
 * Divide un texto en líneas/palabras/caracteres envueltos en spans para animarlos con GSAP.
 * El texto original queda accesible mediante aria-label.
 */
export function SplitText({
  text,
  by = "chars",
  className,
  charClassName,
}: {
  text: string;
  by?: "chars" | "words";
  className?: string;
  charClassName?: string;
}) {
  const words = text.split(" ");
  return (
    <span className={className} aria-label={text} role="text">
      {words.map((word, wi) => (
        <Fragment key={wi}>
          <span aria-hidden className="split-line inline-block align-top">
            {by === "words" ? (
              <span className={`split-unit ${charClassName ?? ""}`}>{word}</span>
            ) : (
              word.split("").map((ch, ci) => (
                <span key={ci} className={`split-unit ${charClassName ?? ""}`}>
                  {ch}
                </span>
              ))
            )}
          </span>
          {wi < words.length - 1 && <span aria-hidden> </span>}
        </Fragment>
      ))}
    </span>
  );
}
