import { useState } from "react";
import type { DimensionRow } from "../types";

export default function DimensionCard({
  dim,
  index,
  last,
}: {
  dim: DimensionRow;
  index?: number;
  last?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const pct = dim.max_score > 0 ? (dim.score ?? 0) / dim.max_score : 0;
  const scoreColor =
    pct >= 0.75
      ? "bg-strong-bg text-strong-text"
      : pct >= 0.5
        ? "bg-[#FFF3E7] text-[#8A4B00]"
        : "bg-weak-bg text-weak-text";

  return (
    <div className={last ? "" : "border-b border-line"}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-paper/60 transition-colors"
      >
        {index !== undefined && (
          <span className="text-sm font-medium text-muted tabular-nums shrink-0 w-6">{index}</span>
        )}
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-ink truncate">
            {dim.dimension_name}
            {!dim.is_applicable && (
              <span className="ml-2 text-xs text-muted font-normal">(not applicable)</span>
            )}
          </div>
          <div className="text-xs text-muted mt-0.5 truncate">{oneLineHint(dim.reasoning)}</div>
        </div>
        <span className={`font-mono text-xs font-medium px-2.5 py-1 rounded-full shrink-0 ${scoreColor}`}>
          {dim.score ?? 0}/{dim.max_score}
        </span>
        <svg
          className={`h-4 w-4 text-muted transition-transform shrink-0 ${open ? "rotate-180" : ""}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div className="px-5 pb-5 pt-1 space-y-4 bg-paper/40">
          {dim.reasoning && (
            <div>
              <p className="text-xs uppercase tracking-widest text-muted mb-1.5">Reasoning</p>
              <p className="text-sm text-ink leading-relaxed">{dim.reasoning}</p>
            </div>
          )}

          <div>
            <p className="text-xs uppercase tracking-widest text-muted mb-1.5">Evidence from transcript</p>
            {dim.evidence.length === 0 ? (
              <p className="text-sm text-muted italic">No transcript evidence found.</p>
            ) : (
              <div className="bg-paper border border-line rounded-card p-4 space-y-2">
                {dim.evidence.map((e, i) => (
                  <div key={i} className="text-sm leading-relaxed">
                    <span className="font-semibold text-ink">{e.speaker}:</span>{" "}
                    <span className="text-ink/80">"{e.quote}"</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {dim.quick_fix && (
            <div>
              <p className="text-xs uppercase tracking-widest text-muted mb-1.5">Quick fix</p>
              <p className="text-sm text-ink leading-relaxed">{dim.quick_fix}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function oneLineHint(reasoning: string | null): string {
  if (!reasoning) return "";
  const firstSentence = reasoning.split(/[.!?]/)[0].trim();
  if (!firstSentence) return "";
  if (firstSentence.length <= 90) return firstSentence + ".";
  return firstSentence.slice(0, 87) + "…";
}
