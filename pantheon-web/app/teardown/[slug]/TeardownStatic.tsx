import { VerdictBanner } from "@/components/VerdictBanner";
import { ContradictionAlert } from "@/components/ContradictionAlert";
import { ConfidenceBar } from "@/components/ConfidenceBar";
import { ShareButton } from "@/components/ShareButton";
import { AGENT_LABELS, AGENT_MODELS, AGENT_ROLES } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import type { Teardown, AgentName } from "@/lib/types";

interface Props {
  teardown: Teardown;
}

export function TeardownStatic({ teardown }: Props) {
  const brief = (() => {
    try {
      return teardown.structured_brief ? JSON.parse(teardown.structured_brief) : null;
    } catch {
      return null;
    }
  })();

  return (
    <main className="min-h-screen bg-zinc-950 py-12 px-4">
      <div className="max-w-5xl mx-auto flex flex-col gap-8">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <a href="/" className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors">
              ← The Pantheon
            </a>
            <h1 className="text-lg font-semibold text-white mt-1 max-w-2xl">
              {teardown.idea_raw}
            </h1>
            <p className="text-xs text-zinc-600 mt-1">{formatDate(teardown.created_at)}</p>
          </div>
          <ShareButton slug={teardown.share_slug} />
        </div>

        {/* Brief */}
        {brief && (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 flex flex-col gap-3">
            <p className="text-xs text-zinc-500 uppercase tracking-wider">Structured brief</p>
            <p className="text-sm font-semibold text-white">{brief.one_liner}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-zinc-400">
              {brief.problem && <div><span className="text-zinc-600">Problem:</span> {brief.problem}</div>}
              {brief.target_customer && <div><span className="text-zinc-600">Customer:</span> {brief.target_customer}</div>}
              {brief.business_model && <div><span className="text-zinc-600">Model:</span> {brief.business_model}</div>}
              {brief.critical_question && (
                <div className="sm:col-span-2">
                  <span className="text-zinc-600">Critical question:</span> {brief.critical_question}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Verdict banner */}
        <VerdictBanner
          verdict={teardown.overall_verdict}
          confidence={teardown.themis_confidence}
          reasoning={teardown.verdict_reasoning}
          devilsAdvocate={teardown.devils_advocate ?? ""}
          criticalInsight={teardown.critical_insight}
        />

        {/* Agent outputs */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {teardown.agent_outputs.map((output) => {
            const name = output.agent_name as AgentName;
            return (
              <div
                key={output.id}
                className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 flex flex-col gap-3"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-semibold text-white">{AGENT_LABELS[name]}</p>
                    <p className="text-xs text-zinc-500">{AGENT_ROLES[name]}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {output.passed_eval === false && (
                      <span className="text-xs text-red-400 bg-red-950 border border-red-800 px-2 py-0.5 rounded">
                        retried
                      </span>
                    )}
                    <span className="text-xs font-mono text-zinc-600 bg-zinc-800 px-2 py-0.5 rounded">
                      {AGENT_MODELS[name]}
                    </span>
                  </div>
                </div>
                <ConfidenceBar score={output.confidence_score} size="sm" />
                <div className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap font-mono max-h-96 overflow-y-auto scrollbar-thin">
                  {output.output_text}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
