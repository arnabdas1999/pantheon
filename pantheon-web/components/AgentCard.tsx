"use client";

import { cn } from "@/lib/utils";
import { ConfidenceBar } from "@/components/ConfidenceBar";
import type { AgentState } from "@/lib/types";
import { AGENT_LABELS, AGENT_MODELS, AGENT_ROLES } from "@/lib/types";

const STATUS_DOT: Record<string, string> = {
  thinking:  "bg-zinc-500 animate-pulse",
  searching: "bg-blue-400 animate-pulse",
  streaming: "bg-emerald-400 animate-pulse",
  reflexion: "bg-purple-400 animate-pulse",
  done:      "bg-emerald-500",
  retry:     "bg-amber-400 animate-pulse",
  error:     "bg-red-500",
};

const STATUS_LABEL: Record<string, string> = {
  thinking:  "Thinking…",
  searching: "Searching…",
  streaming: "Writing…",
  reflexion: "Reflecting…",
  done:      "Done",
  retry:     "Retrying…",
  error:     "Error",
};

interface Props {
  agent: AgentState;
  isLoading?: boolean;
}

export function AgentCard({ agent, isLoading = false }: Props) {
  const label = AGENT_LABELS[agent.name];
  const model = AGENT_MODELS[agent.name];
  const role = AGENT_ROLES[agent.name];
  const isDone = agent.status === "done";

  return (
    <div
      className={cn(
        "rounded-xl border bg-zinc-900 p-5 flex flex-col gap-3 transition-all duration-300",
        isDone ? "border-zinc-700" : "border-zinc-800",
        isLoading && "opacity-50"
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "h-2 w-2 rounded-full shrink-0",
                STATUS_DOT[agent.status] ?? "bg-zinc-600"
              )}
            />
            <span className="font-semibold text-white text-sm">{label}</span>
          </div>
          <span className="text-xs text-zinc-500 pl-4">{role}</span>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className="text-xs font-mono text-zinc-600 bg-zinc-800 px-2 py-0.5 rounded">
            {model}
          </span>
          <span className="text-xs text-zinc-600">
            {STATUS_LABEL[agent.status] ?? agent.status}
            {agent.retryCount > 0 && (
              <span className="text-amber-500 ml-1">#{agent.retryCount}</span>
            )}
          </span>
        </div>
      </div>

      {/* Confidence bar */}
      {isDone && (
        <ConfidenceBar score={agent.confidence} size="sm" />
      )}

      {/* Content — streaming text */}
      <div
        className={cn(
          "text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap font-mono",
          "max-h-96 overflow-y-auto",
          !agent.content && "text-zinc-600 italic"
        )}
      >
        {agent.content || (
          <span>
            {agent.status === "thinking" && "Analyzing brief…"}
            {agent.status === "searching" && "Fetching live data…"}
            {agent.status === "reflexion" && "Running self-critique…"}
            {agent.status === "retry" && "Retrying analysis…"}
          </span>
        )}
        {/* blinking cursor while streaming */}
        {agent.status === "streaming" && (
          <span className="inline-block w-1.5 h-3.5 bg-emerald-400 ml-0.5 animate-pulse align-middle" />
        )}
      </div>
    </div>
  );
}
