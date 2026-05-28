"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase";

function maskKey(key: string): string {
  if (key.length <= 8) return "••••••••";
  return key.slice(0, 4) + "•".repeat(key.length - 8) + key.slice(-4);
}

export default function SettingsPage() {
  const [currentKey, setCurrentKey] = useState<string | null>(null);
  const [newKey, setNewKey] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        router.push("/auth");
        return;
      }
      setCurrentKey((data.user.user_metadata?.groq_api_key as string) ?? null);
      setLoading(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!newKey.trim()) return;
    setSaving(true);
    setError(null);

    const { error } = await supabase.auth.updateUser({
      data: { groq_api_key: newKey.trim() },
    });

    if (error) {
      setSaving(false);
      setError(error.message);
    } else {
      router.push("/");
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/");
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="w-64 h-8 rounded-lg bg-zinc-900 animate-pulse" />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-950 py-12 px-4">
      <div className="max-w-md mx-auto flex flex-col gap-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <Link href="/" className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors">
              ← The Pantheon
            </Link>
            <h1 className="text-lg font-semibold text-white mt-1">Settings</h1>
          </div>
          <button
            onClick={handleSignOut}
            className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
          >
            Sign out
          </button>
        </div>

        {/* Groq API Key */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6 flex flex-col gap-5">
          <div className="flex flex-col gap-1">
            <h2 className="text-sm font-semibold text-white">Groq API Key</h2>
            <p className="text-xs text-zinc-500 leading-relaxed">
              Your key runs the AI agents. Groq is free —{" "}
              <a
                href="https://console.groq.com/keys"
                target="_blank"
                rel="noopener noreferrer"
                className="text-zinc-400 hover:text-white underline transition-colors"
              >
                get one in 2 minutes
              </a>
              .
            </p>
          </div>

          {currentKey && (
            <div className="flex items-center gap-2 rounded-lg bg-zinc-950 border border-zinc-800 px-3 py-2">
              <span className="text-xs text-zinc-600 shrink-0">Current</span>
              <span className="text-sm font-mono text-zinc-400 truncate">{maskKey(currentKey)}</span>
            </div>
          )}

          <form onSubmit={handleSave} className="flex flex-col gap-3">
            <input
              type="text"
              value={newKey}
              onChange={(e) => { setNewKey(e.target.value); setError(null); }}
              placeholder={currentKey ? "Paste new key to replace…" : "gsk_…"}
              autoComplete="off"
              spellCheck={false}
              className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none focus:border-zinc-500 transition-colors font-mono"
            />

            {error && (
              <p className="text-sm text-red-400 bg-red-950 border border-red-800 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={!newKey.trim() || saving}
              className="rounded-xl bg-white text-zinc-900 px-6 py-3 text-sm font-semibold hover:bg-zinc-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {saving ? "Saving…" : currentKey ? "Update key →" : "Save key →"}
            </button>
          </form>
        </div>

        <Link href="/dashboard" className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors">
          My teardowns →
        </Link>
      </div>
    </main>
  );
}
