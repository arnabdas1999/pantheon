"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { createTeardown } from "@/lib/api";
import { createClient } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";

const MAX_CHARS = 2000;
const MIN_CHARS = 10;

export function IdeaInput() {
  const [idea, setIdea] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [user, setUser] = useState<User | null | undefined>(undefined); // undefined = loading
  const [groqApiKey, setGroqApiKey] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user ?? null);
      setGroqApiKey((data.user?.user_metadata?.groq_api_key as string) ?? null);
    });
  }, []);

  const remaining = MAX_CHARS - idea.length;
  const isValid = idea.trim().length >= MIN_CHARS;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      try {
        const { teardown_id, share_slug } = await createTeardown(
          idea.trim(),
          user?.id ?? undefined,
          groqApiKey ?? undefined,
        );
        router.push(`/teardown/${share_slug}?id=${teardown_id}`);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      }
    });
  }

  // Loading state
  if (user === undefined) {
    return <div className="h-[180px] rounded-xl bg-zinc-900 animate-pulse" />;
  }

  // Not logged in
  if (user === null) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 px-6 py-5 flex flex-col gap-3 text-center">
        <p className="text-sm text-zinc-400">Sign in to run a teardown.</p>
        <a
          href="/auth"
          className="rounded-xl bg-white text-zinc-900 px-6 py-2.5 text-sm font-semibold hover:bg-zinc-100 transition-colors inline-block"
        >
          Sign in with email →
        </a>
      </div>
    );
  }

  // Logged in but no Groq key
  if (!groqApiKey) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 px-6 py-5 flex flex-col gap-3 text-center">
        <p className="text-sm text-zinc-400">
          Add your free Groq API key to run teardowns.
        </p>
        <p className="text-xs text-zinc-600">
          Groq is free —{" "}
          <a
            href="https://console.groq.com/keys"
            target="_blank"
            rel="noopener noreferrer"
            className="text-zinc-400 hover:text-white underline transition-colors"
          >
            get a key in 2 minutes
          </a>
          , then add it in Settings.
        </p>
        <a
          href="/settings"
          className="rounded-xl bg-white text-zinc-900 px-6 py-2.5 text-sm font-semibold hover:bg-zinc-100 transition-colors inline-block"
        >
          Go to Settings →
        </a>
      </div>
    );
  }

  // Ready
  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 w-full">
      <div className="relative">
        <textarea
          value={idea}
          onChange={(e) => setIdea(e.target.value)}
          placeholder="Describe your startup idea… be specific. Include the problem, who has it, and how you'd solve it."
          rows={5}
          maxLength={MAX_CHARS}
          className={cn(
            "w-full rounded-xl border bg-zinc-900 px-4 py-3 text-sm text-zinc-100",
            "placeholder:text-zinc-600 resize-none outline-none transition-colors",
            "focus:border-zinc-500 border-zinc-700",
            "scrollbar-thin scrollbar-thumb-zinc-700"
          )}
        />
        <span
          className={cn(
            "absolute bottom-3 right-3 text-xs font-mono",
            remaining < 100 ? "text-amber-500" : "text-zinc-600"
          )}
        >
          {remaining}
        </span>
      </div>

      {error && (
        <p className="text-sm text-red-400 bg-red-950 border border-red-800 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={!isValid || isPending}
        className={cn(
          "rounded-xl px-6 py-3 text-sm font-semibold transition-all",
          "bg-white text-zinc-900 hover:bg-zinc-100",
          "disabled:opacity-40 disabled:cursor-not-allowed",
          isPending && "opacity-60 cursor-wait"
        )}
      >
        {isPending ? "Starting teardown…" : "Run teardown →"}
      </button>
    </form>
  );
}
