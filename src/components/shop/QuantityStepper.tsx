"use client";

import { Minus, Plus } from "lucide-react";

export function QuantityStepper({
  value,
  max,
  onChange,
  label,
  size = "md",
}: {
  value: number;
  max: number;
  onChange: (v: number) => void;
  label: string;
  size?: "sm" | "md";
}) {
  const h = size === "sm" ? "h-8" : "h-11";
  return (
    <div className={`inline-flex ${h} items-center rounded-full border border-bone/15`} role="group" aria-label={label}>
      <button
        type="button"
        onClick={() => onChange(value - 1)}
        disabled={value <= 1}
        className={`flex ${h} w-9 items-center justify-center transition hover:text-blood disabled:opacity-30`}
        aria-label="Reducir cantidad"
      >
        <Minus size={14} />
      </button>
      <output className="w-7 text-center font-mono text-sm tabular-nums" aria-live="polite">
        {value}
      </output>
      <button
        type="button"
        onClick={() => onChange(value + 1)}
        disabled={value >= max}
        className={`flex ${h} w-9 items-center justify-center transition hover:text-blood disabled:opacity-30`}
        aria-label="Aumentar cantidad"
      >
        <Plus size={14} />
      </button>
    </div>
  );
}
