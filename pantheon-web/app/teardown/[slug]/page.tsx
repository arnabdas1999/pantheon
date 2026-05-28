import type { Metadata } from "next";
import { getTeardown } from "@/lib/api";
import { TeardownStream } from "@/app/teardown/[slug]/TeardownStream";
import { TeardownStatic } from "@/app/teardown/[slug]/TeardownStatic";

interface Props {
  params: { slug: string };
  searchParams: { id?: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  try {
    const teardown = await getTeardown(params.slug);
    const verdict = teardown.overall_verdict ?? "In progress";
    return {
      title: `${teardown.idea_raw.slice(0, 60)} — ${verdict}`,
      description: teardown.verdict_reasoning ?? teardown.idea_raw,
      openGraph: {
        title: `The Pantheon: ${verdict}`,
        description: teardown.verdict_reasoning ?? teardown.idea_raw,
        type: "article",
      },
    };
  } catch {
    return { title: "Teardown in progress…" };
  }
}

export default async function TeardownPage({ params, searchParams }: Props) {
  const teardownId = searchParams.id;

  // If we have a teardown_id from the query string, this is a live run
  if (teardownId) {
    return <TeardownStream teardownId={teardownId} slug={params.slug} />;
  }

  // Otherwise fetch the completed teardown from the API
  try {
    const teardown = await getTeardown(params.slug);
    if (teardown.status === "completed") {
      return <TeardownStatic teardown={teardown} />;
    }
    if (teardown.status === "failed") {
      return (
        <main className="min-h-screen flex items-center justify-center px-4">
          <div className="text-center flex flex-col gap-4">
            <p className="text-zinc-400 text-sm">This teardown failed to complete.</p>
            <a href="/" className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors">
              ← Run a new teardown
            </a>
          </div>
        </main>
      );
    }
    // status === "pending" or "processing" — live stream
    return <TeardownStream teardownId={teardown.id} slug={params.slug} />;
  } catch {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-zinc-500">Teardown not found.</p>
      </main>
    );
  }
}
