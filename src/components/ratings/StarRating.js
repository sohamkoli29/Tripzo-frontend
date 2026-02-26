"use client";

import { useState } from "react";

const LABELS = ["", "Terrible", "Poor", "Okay", "Good", "Excellent"];

// ── Interactive star picker ──────────────────────────────────────────────────
export function StarPicker({ value = 0, onChange, size = "lg", disabled = false }) {
  const [hovered, setHovered] = useState(0);

  const sizes = { sm: "text-2xl gap-1", md: "text-3xl gap-1.5", lg: "text-5xl gap-2" };
  const cls   = sizes[size] || sizes.lg;
  const active = hovered || value;

  return (
    <div className="flex flex-col items-center gap-3">
      <div className={"flex " + cls}>
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            disabled={disabled}
            onClick={() => !disabled && onChange?.(star)}
            onMouseEnter={() => !disabled && setHovered(star)}
            onMouseLeave={() => !disabled && setHovered(0)}
            className={[
              "transition-all duration-100 select-none",
              disabled ? "cursor-default" : "cursor-pointer hover:scale-125 active:scale-95",
              star <= active ? "opacity-100 drop-shadow-[0_0_6px_rgba(250,204,21,0.8)]" : "opacity-20 grayscale",
            ].join(" ")}
          >
            ★
          </button>
        ))}
      </div>

      {active > 0 && (
        <span className={[
          "text-sm font-bold px-4 py-1 rounded-full border transition-all duration-200",
          active >= 4 ? "text-green-400  border-green-400/30  bg-green-400/10"
            : active === 3 ? "text-yellow-400 border-yellow-400/30 bg-yellow-400/10"
              : "text-red-400   border-red-400/30   bg-red-400/10",
        ].join(" ")}>
          {LABELS[active]}
        </span>
      )}
    </div>
  );
}

// ── Read-only star display ───────────────────────────────────────────────────
export function StarDisplay({ value = 0, total, size = "sm", showNumber = true, className = "" }) {
  const sizes  = { xs: "text-xs", sm: "text-sm", md: "text-base", lg: "text-xl" };
  const cls    = sizes[size] || sizes.sm;
  const filled = Math.round(parseFloat(value));

  return (
    <div className={"flex items-center gap-1.5 " + cls + " " + className}>
      <span className="flex gap-0.5 text-yellow-400 leading-none">
        {[1, 2, 3, 4, 5].map((s) => (
          <span key={s} className={s <= filled ? "opacity-100" : "opacity-20"}>★</span>
        ))}
      </span>
      {showNumber && (
        <span className="text-white font-semibold tabular-nums">{parseFloat(value).toFixed(1)}</span>
      )}
      {total !== undefined && (
        <span className="text-gray-500">({total})</span>
      )}
    </div>
  );
}