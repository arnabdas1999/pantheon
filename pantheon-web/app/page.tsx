import type { Metadata } from "next";
import Link from "next/link";
import { IdeaInput } from "@/components/IdeaInput";
import { EXAMPLE_TEARDOWNS } from "@/lib/examples";
import { cn, verdictColor, verdictDot } from "@/lib/utils";

export const metadata: Metadata = {
  title: "The Pantheon — Stress-test any startup idea in 2 minutes",
};

const AGENT_BADGES = ["Market", "Technical", "GTM", "Financial", "Risk"];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-zinc-950 flex flex-col">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-zinc-900">
        <span className="font-semibold text-white tracking-tight">The Pantheon</span>
        <Link
          href="/dashboard"
          className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          My teardowns →
        </Link>
      </nav>

      {/* Hero */}
      <section className="flex flex-col items-center text-center gap-6 px-4 pt-20 pb-12">
        <div className="flex gap-2 flex-wrap justify-center">
          {AGENT_BADGES.map((name) => (
            <span
              key={name}
              className="text-xs font-mono text-zinc-500 bg-zinc-900 border border-zinc-800 rounded px-2 py-0.5"
            >
              {name}
            </span>
          ))}
        </div>

        <h1 className="text-4xl sm:text-5xl font-bold text-white tracking-tight max-w-2xl leading-tight">
          Stress-test any startup idea{" "}
          <span className="text-zinc-500">in 2 minutes</span>
        </h1>
        <p className="text-zinc-400 text-base max-w-xl leading-relaxed">
          7 AI agents tear apart your idea across market size, technical
          complexity, GTM strategy, unit economics, and risk — in parallel.
          Get a structured verdict with sources.
        </p>

        {/* Input */}
        <div className="w-full max-w-xl">
          <IdeaInput />
        </div>
      </section>

      {/* How it works */}
      <section className="flex flex-col items-center gap-6 px-4 py-12 border-t border-zinc-900">
        <h2 className="text-sm text-zinc-500 uppercase tracking-widest">How it works</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-3xl w-full">
          {[
            {
              step: "01",
              title: "Describe your idea",
              body: "Include the problem, who has it, and how you'd solve it. The more specific, the better.",
            },
            {
              step: "02",
              title: "7 agents fire in parallel",
              body: "Kronos structures your brief. Five specialists research and analyze. Themis judges their outputs.",
            },
            {
              step: "03",
              title: "Get a verdict in ~90 seconds",
              body: "BUILD IT, VALIDATE FIRST, or AVOID — with detailed reasoning and a shareable URL.",
            },
          ].map(({ step, title, body }) => (
            <div key={step} className="flex flex-col gap-2">
              <span className="text-xs font-mono text-zinc-700">{step}</span>
              <p className="text-sm font-semibold text-white">{title}</p>
              <p className="text-sm text-zinc-500 leading-relaxed">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Example teardowns */}
      <section className="flex flex-col items-center gap-6 px-4 py-12 border-t border-zinc-900">
        <h2 className="text-sm text-zinc-500 uppercase tracking-widest">Example teardowns</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-5xl w-full">
          {EXAMPLE_TEARDOWNS.map((ex) => (
            <div
              key={ex.slug}
              className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 flex flex-col gap-3"
            >
              <div className="flex items-center gap-2">
                <span className={cn("h-2 w-2 rounded-full shrink-0", verdictDot(ex.verdict))} />
                <span className={cn("text-xs font-semibold", verdictColor(ex.verdict))}>
                  {ex.verdict}
                </span>
                <span className="ml-auto text-xs text-zinc-600 font-mono">{ex.confidence}%</span>
              </div>
              <p className="text-sm text-zinc-300 leading-snug">{ex.idea}</p>
              <p className="text-xs text-zinc-500 leading-relaxed line-clamp-3">{ex.reasoning}</p>
              <div className="flex items-center justify-between mt-auto pt-2">
                <span className="text-xs text-zinc-700">{ex.category}</span>
                <Link
                  href={`/teardown/${ex.slug}`}
                  className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  View teardown →
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-zinc-900 px-6 py-6 flex items-center justify-between text-xs text-zinc-700">
        <span>The Pantheon</span>
        <span>Built with Llama 3.3 70B via Groq</span>
      </footer>
    </main>
  );
}
