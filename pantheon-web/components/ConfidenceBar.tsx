"use client";

import { cn } from "@/lib/utils";

interface Props {
  score: number | null;
  size?: "sm" | "md";
}

export function ConfidenceBar({ score, size = "md" }: Props) {
  if (score === null) return null;
  const pct = Math.max(0, Math.min(100, score));
  const color =
    pct >= 80 ? "bg-green-500" : pct >= 65 ? "bg-amber-500" : "bg-red-500";

  return (
    <div className="flex items-center gap-2">
      <div
        className={cn(
          "w-full rounded-full bg-zinc-800 overflow-hidden",
          size === "sm" ? "h-1" : "h-1.5"
        )}
      >
        <div
          className={cn("h-full rounded-full transition-all duration-700", color)}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span
        className={cn(
          "font-mono tabular-nums shrink-0",
          size === "sm" ? "text-xs text-zinc-400" : "text-sm text-zinc-300"
        )}
      >
        {pct}
      </span>
    </div>
  );
}
