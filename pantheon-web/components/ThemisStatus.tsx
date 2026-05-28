"use client";

import { cn } from "@/lib/utils";

interface Props {
  status: string | null;
  devilsAdvocate: string;
}

export function ThemisStatus({ status, devilsAdvocate }: Props) {
  if (!status) return null;

  return (
    <div className="rounded-xl border border-zinc-700 bg-zinc-900 p-5 flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <span
          className={cn(
            "h-2 w-2 rounded-full",
            status === "done" ? "bg-zinc-500" : "bg-purple-400 animate-pulse"
          )}
        />
        <span className="text-sm font-semibold text-white">Themis</span>
        <span className="text-xs text-zinc-500 ml-1">Eval Judge · Llama-3.3-70B</span>
      </div>

      <p className="text-xs text-zinc-500">
        {status === "evaluating" && "Scoring all 5 agent outputs…"}
        {status === "devils_advocate" && "Running devil's advocate pass…"}
      </p>

      {devilsAdvocate && (
        <div className="border-t border-zinc-800 pt-3">
          <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">
            Devil&apos;s advocate
          </p>
          <p className="text-sm text-zinc-400 leading-relaxed italic whitespace-pre-wrap">
            {devilsAdvocate}
            {status === "devils_advocate" && (
              <span className="inline-block w-1.5 h-3.5 bg-purple-400 ml-0.5 animate-pulse align-middle" />
            )}
          </p>
        </div>
      )}
    </div>
  );
}
