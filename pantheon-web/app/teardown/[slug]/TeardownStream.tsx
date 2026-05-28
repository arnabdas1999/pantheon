"use client";

import { useTeardownStream } from "@/lib/ws";
import { AgentCard } from "@/components/AgentCard";
import { VerdictBanner } from "@/components/VerdictBanner";
import { ContradictionAlert } from "@/components/ContradictionAlert";
import { ThemisStatus } from "@/components/ThemisStatus";
import { ShareButton } from "@/components/ShareButton";
import { WORKER_AGENTS } from "@/lib/types";

interface Props {
  teardownId: string;
  slug: string;
}

export function TeardownStream({ teardownId, slug }: Props) {
  const state = useTeardownStream(teardownId);

  return (
    <main className="min-h-screen bg-zinc-950 py-12 px-4">
      <div className="max-w-5xl mx-auto flex flex-col gap-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <a href="/" className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors">
              ← The Pantheon
            </a>
            <h1 className="text-lg font-semibold text-white mt-1">Teardown in progress</h1>
          </div>
          {state.isDone && <ShareButton slug={slug} />}
        </div>

        {/* Contradiction alerts */}
        {state.contradictions.length > 0 && (
          <ContradictionAlert contradictions={state.contradictions} />
        )}

        {/* 5 agent cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {WORKER_AGENTS.map((name) => (
            <AgentCard key={name} agent={state.agents[name]} />
          ))}
        </div>

        {/* Themis evaluation status */}
        {state.themisStatus && (
          <ThemisStatus
            status={state.themisStatus}
            devilsAdvocate={state.devilsAdvocate}
          />
        )}

        {/* Final verdict */}
        {state.verdict && (
          <VerdictBanner
            verdict={state.verdict}
            confidence={state.verdictConfidence}
            reasoning={state.verdictReasoning}
            devilsAdvocate={state.devilsAdvocate}
          />
        )}

        {/* Error */}
        {state.error && (
          <div className="rounded-xl border border-red-800 bg-red-950 p-4">
            <p className="text-sm text-red-300">{state.error}</p>
          </div>
        )}
      </div>
    </main>
  );
}
