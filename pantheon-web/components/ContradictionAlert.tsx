"use client";

interface Props {
  contradictions: string[];
}

export function ContradictionAlert({ contradictions }: Props) {
  if (!contradictions.length) return null;

  return (
    <div className="rounded-xl border border-amber-800 bg-amber-950 p-4 flex flex-col gap-2">
      <p className="text-xs text-amber-400 uppercase tracking-wider font-semibold">
        Cross-agent conflicts detected
      </p>
      <ul className="flex flex-col gap-1.5">
        {contradictions.map((c, i) => (
          <li key={i} className="text-sm text-amber-200 leading-relaxed flex gap-2">
            <span className="text-amber-600 shrink-0">!</span>
            <span>{c}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
