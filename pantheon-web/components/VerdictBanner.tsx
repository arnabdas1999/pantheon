"use client";

import { cn, verdictBg, verdictColor, verdictDot } from "@/lib/utils";
import { ConfidenceBar } from "@/components/ConfidenceBar";
import type { Verdict } from "@/lib/types";

interface Props {
  verdict: Verdict | null;
  confidence: number | null;
  reasoning: string | null;
  devilsAdvocate?: string;
  criticalInsight?: string | null;
}

export function VerdictBanner({
  verdict,
  confidence,
  reasoning,
  devilsAdvocate,
  criticalInsight,
}: Props) {
  if (!verdict) return null;

  return (
    <div
      className={cn(
        "rounded-xl border p-6 flex flex-col gap-4 animate-fade-in",
        verdictBg(verdict)
      )}
    >
      {/* Verdict badge */}
      <div className="flex items-center gap-3">
        <span className={cn("h-3 w-3 rounded-full shrink-0", verdictDot(verdict))} />
        <span className={cn("text-2xl font-bold tracking-tight", verdictColor(verdict))}>
          {verdict}
        </span>
        {confidence !== null && (
          <span className="ml-auto text-sm font-mono text-zinc-400">
            {confidence}% confidence
          </span>
        )}
      </div>

      {/* Confidence bar */}
      {confidence !== null && <ConfidenceBar score={confidence} />}

      {/* Reasoning */}
      {reasoning && (
        <p className="text-sm text-zinc-300 leading-relaxed">{reasoning}</p>
      )}

      {/* Critical insight */}
      {criticalInsight && (
        <div className="border-t border-zinc-700 pt-4">
          <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">
            Cross-domain insight
          </p>
          <p className="text-sm text-zinc-300 leading-relaxed">{criticalInsight}</p>
        </div>
      )}

      {/* Devil&apos;s advocate */}
      {devilsAdvocate && (
        <div className="border-t border-zinc-700 pt-4">
          <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">
            Devil&apos;s advocate
          </p>
          <p className="text-sm text-zinc-400 leading-relaxed italic">{devilsAdvocate}</p>
        </div>
      )}
    </div>
  );
}
