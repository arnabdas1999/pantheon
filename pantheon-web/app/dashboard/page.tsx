"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase";
import { getUserTeardowns } from "@/lib/api";
import { formatDate, verdictColor, verdictDot } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { TeardownSummary } from "@/lib/types";

export default function DashboardPage() {
  const [teardowns, setTeardowns] = useState<TeardownSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  // createClient() is stable — instantiate once outside the effect
  const supabase = createClient();

  useEffect(() => {
    const { auth } = supabase;
    auth.getUser().then(({ data }) => {
      if (!data.user) {
        window.location.href = "/auth";
        return;
      }
      setUserId(data.user.id);
      getUserTeardowns(data.user.id)
        .then(setTeardowns)
        .finally(() => setLoading(false));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSignOut() {
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  return (
    <main className="min-h-screen bg-zinc-950 py-12 px-4">
      <div className="max-w-3xl mx-auto flex flex-col gap-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <Link href="/" className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors">
              ← The Pantheon
            </Link>
            <h1 className="text-lg font-semibold text-white mt-1">My teardowns</h1>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/settings" className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors">
              Settings
            </Link>
            <button
              onClick={handleSignOut}
              className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>

        {/* Teardown list */}
        {loading ? (
          <div className="flex flex-col gap-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 rounded-xl bg-zinc-900 animate-pulse" />
            ))}
          </div>
        ) : teardowns.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-zinc-500 text-sm">No teardowns yet.</p>
            <Link
              href="/"
              className="mt-3 inline-block text-sm text-zinc-400 hover:text-white transition-colors"
            >
              Run your first teardown →
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {teardowns.map((td) => (
              <Link
                key={td.id}
                href={`/teardown/${td.share_slug}`}
                className="group rounded-xl border border-zinc-800 bg-zinc-900 hover:border-zinc-700 p-4 flex items-center gap-4 transition-colors"
              >
                <span
                  className={cn(
                    "h-2 w-2 rounded-full shrink-0",
                    verdictDot(td.overall_verdict)
                  )}
                />
                <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                  <p className="text-sm text-white truncate">{td.idea_raw}</p>
                  <p className="text-xs text-zinc-600">{formatDate(td.created_at)}</p>
                </div>
                {td.overall_verdict && (
                  <span className={cn("text-xs font-semibold shrink-0", verdictColor(td.overall_verdict))}>
                    {td.overall_verdict}
                  </span>
                )}
                {td.themis_confidence !== null && (
                  <span className="text-xs font-mono text-zinc-600 shrink-0">
                    {td.themis_confidence}%
                  </span>
                )}
                <span className="text-zinc-700 group-hover:text-zinc-400 text-xs transition-colors">
                  →
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
